import React, { Component } from 'react';
import update from 'react-addons-update';
import {Form, Row, Col, Button, Dropdown, Container} from 'react-bootstrap';
import {Range} from 'react-range';

class App extends Component {
  state = {
    files: {},
    id: 0,
    message: null,
    currentDir: '',
    dirs: [],
    values: [],
    hideEdit: true,
    hideUpload: true,
    upload: null,
    uploadInput: null,
    backend: '',
    loading: false,
    sampler: '',
    fileSystem: '',
    freeSpace: '',
  };

  componentDidMount() {
    this.setState({ backend: window.location.origin.replace('3000', '3001') }); // For development server
    this.fetchData();
    this.fetchSystemInfo();
  }

  fetchData = () => {
    this.clearUpload();
    fetch('/api/data')
      .then(data => data.json())
      .then(res => this.setState({
        files: res.files,
        currentDir: res.currentDir,
        dirs: res.dirs
      }));
  }

  fetchSystemInfo = () => {
    fetch('/api/system')
      .then(data => data.json())
      .then(res => this.setState({
        sampler: res.sampler,
        fileSystem: res.fileSystem,
        freeSpace: res.freeSpace
      }));
  }
  handleChange = (event) => {
    const newState = update(this.state, {
      files: {
        [event.target.id]: {$set: event.target.value}
      }
    });
    this.setState(newState);
  }

  handleFix = (eventKey, event) => {
    event.preventDefault();
    this.setState({ loading: true });
    const body = { index: eventKey };
    fetch('/api/fix', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(data => data.json())
    .then(res => {
      this.fetchData();
      this.setState({ loading: false });
    });
  }

  handleSubmit = (event) => {
    event.preventDefault();
    this.setState({ loading: true });
    let filtered = {};
    for (let [key, value] of Object.entries(this.state.files)) {
      if (value) {
        filtered[key] = value;
      }
    }
    this.setState({ files: {} });
    fetch('/api/rename', {
      method: 'POST',
      body: JSON.stringify(filtered),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(data => data.json())
    .then(res => {
      this.fetchData();
      this.setState({ loading: false });
    });
  }

  handleChangeDir = (eventKey, event) => {
    event.preventDefault();
    this.setState({ loading: true });
    const body = { dir: eventKey };
    fetch('/api/cwd', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(data => data.json())
    .then(res => {
      this.fetchData();
      this.setState({ loading: false });
    });
  }

  handleChangeDirRoot = (event) => {
    event.preventDefault();
    this.setState({ loading: true });
    fetch('/api/cwd', {
      method: 'DELETE',
      body: '{}',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(data => data.json())
    .then(res => {
      this.fetchData();
      this.setState({ loading: false });
    });
  }

  handleCancel = (event) => {
    event.preventDefault();
    this.setState({ loading: true });
    this.setState({ files: {} });
    this.fetchData();
    this.setState({ loading: false });
  }

  handleDelete = (key) => {
    const { files } = this.state;
    const filename = files[key] ? files[key] : key;
    const newValue = '---' + filename;
    const newState = update(this.state, {
      files: {
        [key]: {$set: newValue}
      }
    });
    this.setState(newState);
  }

  handleZip = (key) => {
    this.setState({ loading: true });
    const body = { file: key };
    fetch('/api/zip', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(data => data.json())
    .then(res => {
      this.fetchData();
      this.setState({ loading: false });
    });
  }

  handleUnzip = (key) => {
    this.setState({ loading: true });
    const body = { file: key };
    fetch('/api/unzip', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(data => data.json())
    .then(res => {
      this.fetchData();
      this.setState({ loading: false });
    });
  }

  handleNewDirectory = () => {
    this.setState({ loading: true });
    fetch('/api/mkdir', {
      method: 'POST',
      body: '{}',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(data => data.json())
    .then(res => {
      this.fetchData();
      this.setState({ loading: false });
    });
  }

  handleUpload = (event) => {
    event.preventDefault();
    this.setState({ loading: true });
    const { upload } = this.state;
    const filedata = new FormData();
    upload.forEach(file => {
      filedata.append(file.name, file);
    });

    fetch('/api/upload', {
      method: 'POST',
      body: filedata,
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(data => data.json())
    .then(res => {
      this.fetchData();
      this.setState({ loading: false });
    });
    this.clearUpload();
  }

  handleSystem = (eventKey, event) => {
    event.preventDefault();
    this.setState({ loading: true });
    fetch('/api/' + eventKey, {
      method: 'POST',
      body: '{}',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(data => data.json())
    .then(res => {
      this.fetchSystemInfo();
      this.setState({ loading: false });
    });
  }

  toggleUpload = () => {
    const { hideUpload } = this.state;
    this.setState({ hideUpload: !hideUpload });
  }

  toggleEdit = () => {
    const { hideEdit } = this.state;
    this.setState({ hideEdit: !hideEdit });
  }

  clearUpload = () => {
    const { uploadInput } = this.state;
    if (uploadInput !== null) {
      uploadInput.value = null;
    }
    this.setState({ upload: null });
  }

  addFiles = (event) => {
    this.setState({ uploadInput: event.target });
    this.setState({ upload: Array.from(event.target.files) });
  }

  getVolume = (key) => {
    const { files } = this.state;
    const filename = files[key] ? files[key] : key;
    const volumeRegex = /_([0-9]+)(d[0-9]+.wav|.wav$)/;
    const matches = filename.match(volumeRegex);
    if (matches && matches.length === 3) {
      const volume = Number(matches[1]);
      return [Math.max(Math.min(volume, 100), 0)];
    }
    return [1];
  }

  setVolume = (key, volume) => {
    const { files } = this.state;
    const filename = files[key] ? files[key] : key;
    const volumeRegex = /(.*_)([0-9]+)(d[0-9]+.wav|.wav$)/;
    const matches = filename.match(volumeRegex);
    if (matches && matches.length === 4) {
      const newFilename = matches[1] + volume[0] + matches[3];
      const newState = update(this.state, {
        files: {
          [key]: {$set: newFilename}
        }
      });
      this.setState(newState);
    }
  }

  getVolumeTrackStyle = (key, dirs, props) => {
    if (key.match(/wav$/)) {
      return {
        ...props.style,
        marginTop: '12px',
        height: '16px',
        backgroundColor: '#9cc'
      };
    }
    else if (dirs.includes(key)) {
      return {
        ...props.style,
        marginTop: '12px',
        height: '16px',
        backgroundColor: '#fda'
      };
    }
    else {
      return {
        ...props.style,
        marginTop: '12px',
        height: '16px',
        backgroundColor: '#ccc'
      };
    }
  }

  getVolumeThumbStyle = (key, dirs, props) => {
    if (key.match(/wav$/)) {
      return {
        ...props.style,
        height: "24px",
        width: "16px",
        backgroundColor: "#777"
      };
    }
    else if (dirs.includes(key)) {
      return {
        ...props.style,
        height: "16px",
        width: "1px",
        backgroundColor: "#fda"
      };
    }
    else {
      return {
        ...props.style,
        height: "16px",
        width: "1px",
        backgroundColor: "#ccc"
      };
    }
  }

  getFilenameStyle = (key, files) => {
    const file = files[key];
    if (file.startsWith("---")) {
      return {
        color: "#f00",
        fontWeight: "bold"
      };
    }
    else if (file && key !== file) {
      return {
        color: "#0b0",
        fontStyle: "italic",
        fontWeight: "bold",
        textDecoration: "underline"
      };
    }
    else {
      return {};
    }
  }

  render() {
    const {
      files, currentDir, dirs, hideEdit, hideUpload, upload,
      backend, loading, fileSystem, freeSpace, sampler
    } = this.state;
    const flexStyle = {
      display: "flex",
      flexWrap: "wrap"
    };

    return (
      <div>
        <h1>SamplerFox</h1>
        <p style={{ fontStyle: "italic" }}>Sampler: {sampler}, Filesystem: {fileSystem}, Free space: {freeSpace}{loading ? ' ...' : ''}</p>
        <Form onSubmit={this.handleUpload}>
          <div style={flexStyle}>
            <Button style={{width: "80px"}} variant="secondary" onClick={this.handleChangeDirRoot}>
              Home
            </Button>
            <Dropdown onSelect={this.handleChangeDir}>
              <Dropdown.Toggle style={{width: "75px"}} variant="warning" id="dropdown-changedir">
                Dirs
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {dirs.length === 0 ?
                   <Dropdown.Item key="none" disabled="true">None</Dropdown.Item>
                 : dirs.map(dir =>
                   <Dropdown.Item key={dir} eventKey={dir}>{dir}</Dropdown.Item>
                 )}
              </Dropdown.Menu>
            </Dropdown>
            <Button style={{width: "60px"}} variant="warning" disabled={Object.keys(files).includes('newdir')} onClick={this.handleNewDirectory}>
              Dir+
            </Button>
            <Button style={{width: "80px"}} variant="primary" type="submit" disabled={upload === null}>Upload</Button>
            <Button variant="light" onClick={this.toggleUpload}>{hideUpload ? ">" : "<"}</Button>
          </div>
          <Form.Group hidden={hideUpload}>
            <Form.Control style={{paddingTop: "12px"}} id="fileUpload" type="file" multiple onChange={this.addFiles}/>
          </Form.Group>
        </Form>
        <Form onSubmit={this.handleSubmit}>
          <div style={flexStyle}>
            <Button style={{width: "80px"}} variant="secondary" onClick={this.handleCancel}>
              Cancel
            </Button>
            <Dropdown onSelect={this.handleSystem}>
              <Dropdown.Toggle style={{width: "100px"}} variant="dark" id="dropdown-system">
                System
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item hidden={sampler === 'on'} eventKey="start">Start sampler</Dropdown.Item>
                <Dropdown.Item hidden={sampler === 'off'} eventKey="stop">Stop sampler</Dropdown.Item>
                <Dropdown.Item hidden={fileSystem === 'ro'} eventKey="lock">Lock filesystem (ro)</Dropdown.Item>
                <Dropdown.Item hidden={fileSystem === 'rw'} eventKey="unlock">Unlock filesystem (rw)</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item eventKey="exit">Exit</Dropdown.Item>
                <Dropdown.Item eventKey="reboot">Reboot</Dropdown.Item>
                <Dropdown.Item eventKey="shutdown">Shutdown</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Dropdown onSelect={this.handleFix}>
              <Dropdown.Toggle style={{width: "60px"}} variant="info" id="dropdown-fix">
                Fix
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item eventKey="0">0</Dropdown.Item>
                <Dropdown.Item eventKey="3">3</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Button style={{width: "55px"}} variant="primary" type="submit">
              OK
            </Button>
            <Button variant="light" onClick={this.toggleEdit}>{hideEdit ? ">" : "<"}</Button>
          </div>
          <h4 style={{paddingTop: "12px"}}>{currentDir}</h4>
          {Object.keys(files).map(key => 
            <Container key={key} fluid={true}>
              <Form.Group as={Row} key={key}>
                <Col sm="4">
                <Range
                  step={1}
                  min={0}
                  max={100}
                  disabled={!key.match(/wav$/)}
                  values={this.getVolume(key)}
                  onChange={val => this.setVolume(key, val)}
                  renderTrack={({ props, children }) => (
                    <div {...props} style={this.getVolumeTrackStyle(key, dirs, props)}>
                      {children}
                    </div>
                  )}
                  renderThumb={({ props }) => (
                    <div {...props} style={this.getVolumeThumbStyle(key, dirs, props)}/>
                  )}
                />
                </Col>
                <Col sm="6">
                  <Form.Control id={key} style={this.getFilenameStyle(key, files)} plaintext value={files[key] ? files[key] : key} onChange={this.handleChange}/>
                </Col>
                <Col hidden={hideEdit} sm="2">
                  <Button variant="outline-dark" disabled={dirs.includes(key)} href={backend + "/api/download/" + key}>
                    v
                  </Button>
                  <Button variant="outline-info" disabled={key.endsWith(".zip")} onClick={() => this.handleZip(key)}>
                    z
                  </Button>
                  <Button variant="outline-secondary" disabled={!key.endsWith(".zip") || Object.keys(files).includes(key.replace(/\.zip$/, ""))} onClick={() => this.handleUnzip(key)}>
                    u
                  </Button>
                  <Button variant="outline-danger" disabled={files[key].startsWith("---")} onClick={() => this.handleDelete(key)}>
                    -
                  </Button>
                </Col>
              </Form.Group>
            </Container>
          )}
        </Form>
      </div>
    );
  }
}
export default App;
