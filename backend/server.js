const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const extract = require('extract-zip');
const proc = require('child_process');
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
//const logger = require('morgan');

const ROOT_DIR = '/home/pi/sounds';
const NEW_DIR_NAME = 'newdir';
const SOUND_FILE_EXTENSION = '.wav';
const START_CMD = 'sudo systemctl start samplerbox-starter';
const STOP_CMD = 'ps aux | grep -v grep | grep \'startm\\|samplerbox\' | awk \'{ print $2 }\' | xargs sudo kill ; sudo aconnect -x';
const API_PORT = 3001;

const app = express();
const router = express.Router();
let currentDir = ROOT_DIR;

app.use(cors());
app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit:'5gb' }));
//app.use(logger('dev'));

list = () => {
  return fs.readdirSync(currentDir).sort(collator.compare);
}

listDirs = () => {
  return fs.readdirSync(currentDir)
           .filter(f => fs.statSync(path.join(currentDir, f)).isDirectory());
}

rename = (from, to) => {
  fs.renameSync(
    path.join(currentDir, from),
    path.join(currentDir, to)
  );
}

remove = (file) => {
  if (fs.statSync(path.join(currentDir, file)).isDirectory()) {
    fs.rmdirSync(path.join(currentDir, file), { recursive: true });
  }
  else {
    fs.unlinkSync(path.join(currentDir, file));
  }
}

execute = (command, res) => {
  proc.exec(command, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error });
    }
    res.json({ success: true });
  });
}

lock = () => {
  proc.execSync('sudo mount -o remount,ro / || true');
  proc.execSync('sudo mount -o remount,ro /boot || true');
}

router.get('/data', (req, res) => {
  let files = {};
  list().forEach(file => {
    files[file] = '';
  });
  const dirs = listDirs();
  res.json({ success: true, files: files, dirs: dirs, currentDir: currentDir });
});

router.post('/cwd', (req, res) => {
  currentDir = path.join(currentDir, req.body.dir);
  res.json({ success: true });
});

router.delete('/cwd', (req, res) => {
  currentDir = ROOT_DIR;
  res.json({ success: true });
});

router.post('/rename', (req, res) => {
  const files = req.body;
  for (let key in files) {
    if (files[key].startsWith('---')) {
      remove(key);
    }
    else {
      rename(key, files[key]);
    }
  }
  res.json({ success: true });
});

router.post('/fix', (req, res) => {
  const indexRegex = /^[0-9]+_(.+)/;
  const volumeRegex = /_[0-9]+(d[0-9]+|$)/;
  const doubleNoteRegex = /d[0-9]+$/;
  const files = list();
  let i = Number(req.body.index);
  files.forEach(file => {
    let extension = path.extname(file);
    if (extension.toLowerCase() != SOUND_FILE_EXTENSION) {
      return;
    }
    let name = path.basename(file, extension);
    const matches = name.match(indexRegex);
    if (matches && matches.length === 2) {
      name = matches[1];
    }
    let volume = '';
    if (!volumeRegex.test(name)) {
      volume = '_100';
    }
    let doubleNote = '';
    if (!doubleNoteRegex.test(name)) {
      doubleNote = 'd0';
    }
    const newName = i + '_' + name + volume + doubleNote + extension.toLowerCase();
    if (file !== newName) {
      rename(file, newName);
    }
    i++;
  });
  res.json({ success: true });
});

router.post('/unzip', (req, res) => {
  extract(path.join(currentDir, req.body.file), { dir: currentDir }, err => {
    if (err) {
      res.status(500).json({ error: err });
    }
    else {
      res.json({ success: true });
    }
  });
});

router.post('/zip', (req, res) => {
  const archive = archiver('zip');
  const file = req.body.file;
  const output = fs.createWriteStream(path.join(currentDir, file + '.zip'));

  output.on('close', () => {
    res.json({ success: true });
  });
  archive.on('warning', err => {
    res.status(500).json({ error: err.message });
  });
  archive.on('error', err => {
    res.status(500).json({ error: err.message });
  });
  archive.pipe(output);

  const filePath = path.join(currentDir, file);
  if (fs.statSync(filePath).isDirectory()) {
    archive.directory(filePath, file);
  }
  else {
    archive.file(filePath, { name: file });
  }
  archive.finalize();
});

router.post('/upload', (req, res, next) => {
  const files = req.files;
  for (key in files) {
    const file = files[key];
    file.mv(path.join(currentDir, file.name));
  }
  res.json({ success: true });
});

router.get('/download/:filename', (req, res) => {
  res.download(path.join(currentDir, req.params.filename));
});

router.post('/mkdir', (req, res) => {
  fs.mkdirSync(path.join(currentDir, NEW_DIR_NAME), { recursive: false }, err => {
    if (err) {
      res.status(500).json({ error: err });
    }
  });
  res.json({ success: true });
});

router.post('/lock', (req, res) => {
  execute('sudo mount -o remount,ro / ; sudo mount -o remount,ro /boot', res);
});

router.post('/unlock', (req, res) => {
  execute('sudo mount -o remount,rw / ; sudo mount -o remount,rw /boot', res);
});

router.post('/start', (req, res) => {
  execute(START_CMD, res);
});

router.post('/stop', (req, res) => {
  execute(STOP_CMD, res);
});

router.post('/restart', (req, res) => {
  proc.execSync(STOP_CMD);
  proc.execSync(START_CMD);
  res.json({ success: true });
});

router.post('/exit', (req, res) => {
  lock();
  proc.execSync('sudo /etc/init.d/nginx stop || true');
  proc.execSync('sudo rfkill block wifi || true');
  execute('sudo systemctl stop samplerfox-be', res);
});

router.post('/reboot', (req, res) => {
  lock();
  proc.exec('sudo reboot');
  res.json({ success: true });
});

router.post('/shutdown', (req, res) => {
  lock();
  proc.exec('sudo halt');
  res.status(404).json({ error: 'shutdown' });
});

router.get('/system', (req, res) => {
  const ps = proc.execSync('ps aux | grep -v grep | grep samplerbox || true');
  const fs = proc.execSync('sudo mount | grep "/dev/.* on / " | sed "s/.*\\(r[w|o]\\).*/\\1/g" || true');
  const df = proc.execSync('df -h | grep "/dev/root" | awk \'{ print $4 }\' || true');
  res.json({
    success: true,
    fileSystem: fs.toString().trim(),
    freeSpace: df.toString(),
    sampler: ps.toString().trim() ? 'on' : 'off'
  });
});

app.use('/api', router);
app.listen(API_PORT);
