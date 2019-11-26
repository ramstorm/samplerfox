const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const extract = require('extract-zip');
const proc = require('child_process');
//const logger = require('morgan');

const soundFileExtension = '.wav';
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const rootDir = '/home/pi/sounds';
const newDirName = 'newdir';
const API_PORT = 3001;
const app = express();
const router = express.Router();
let currentDir = rootDir;

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
  currentDir = rootDir;
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

router.post('/format', (req, res) => {
  const indexRegex = /^[0-9]+_(.+)/;
  const volumeRegex = /_[0-9]+(d[0-9]+|$)/;
  const files = list();
  let i = Number(req.body.index);
  files.forEach(file => {
    let extension = path.extname(file);
    if (extension.toLowerCase() != soundFileExtension) {
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
    const newName = i + '_' + name + volume + extension.toLowerCase();
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
  fs.mkdirSync(path.join(currentDir, newDirName), { recursive: false }, err => {
    if (err) {
      res.status(500).json({ error: err });
    }
  });
  res.json({ success: true });
});

router.post('/lock', (req, res) => {
  proc.exec('sudo mount -o remount,ro / ; sudo mount -o remount,ro /boot', (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error });
    }
    res.json({ success: true });
  });
});

router.post('/unlock', (req, res) => {
  proc.exec('sudo mount -o remount,rw / ; sudo mount -o remount,rw /boot', (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error });
    }
    res.json({ success: true });
  });
});

router.get('/system', (req, res) => {
  const mount = proc.execSync('mount | grep "/dev/.* on / " | sed "s/.*\\(r[w|o]\\).*/\\1/g"');
  res.json({ success: true, data: mount.toString().trim() });
});

router.get('/kill', (req, res) => {
  process.exit(0);
});

app.use('/api', router);
app.listen(API_PORT);
