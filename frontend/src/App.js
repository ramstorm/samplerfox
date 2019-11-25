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
    values: [50],
    upload: null,
    uploadInput: null,
    backend: '',
  };

  componentDidMount() {
    this.setState({ backend: window.location.origin.replace('3000', '3001') });
    this.fetchData();
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

  handleChange = (event) => {
    const newState = update(this.state, {
      files: {
        [event.target.id]: {$set: event.target.value}
      }
    });
    this.setState(newState);
  }

  handleFormat = (eventKey, event) => {
    event.preventDefault();
    const body = { index: eventKey };
    fetch('/api/format', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(data => data.json())
    .then(res => {
      this.fetchData();
    });
  }

  handleSubmit = (event) => {
    event.preventDefault();
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
    });
  }

  handleChangeDir = (eventKey, event) => {
    event.preventDefault();
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
    });
  }

  handleChangeDirRoot = (event) => {
    event.preventDefault();
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
    });
  }

  handleCancel = (event) => {
    event.preventDefault();
    this.setState({ files: {} });
    this.fetchData();
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
    });
  }

  handleUnzip = (key) => {
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
    });
  }

  handleNewDirectory = () => {
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
    });
  }

  handleUpload = (event) => {
    event.preventDefault();
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
    });
    this.clearUpload();
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
      return [Number(matches[1])];
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
    const { files, currentDir, dirs, upload, backend } = this.state;
    const flexStyle = {
      display: "flex",
      flexWrap: "wrap"
    };

    return (
      <div>
        <h1>SamplerFox</h1>
        <h4>Navigation</h4>
        <div style={flexStyle}>
          <Button variant="secondary" onClick={this.handleChangeDirRoot}>
            Home
          </Button>
          <Dropdown onSelect={this.handleChangeDir}>
            <Dropdown.Toggle variant="warning" id="dropdown-basic">
              {currentDir}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {dirs.length === 0 ?
                 <Dropdown.Item key="none" disabled="true">None</Dropdown.Item>
               : dirs.map(dir =>
                 <Dropdown.Item key={dir} eventKey={dir}>{dir}</Dropdown.Item>
               )}
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <h4 style={{paddingTop: "12px"}}>Upload Files</h4>
        <Form onSubmit={this.handleUpload}>
        <div style={flexStyle}>
          <Button style={{height: "38px"}} variant="primary" type="submit" disabled={upload === null}>Upload</Button>
          <Form.Group>
            <Form.Control style={{paddingLeft: "2px", paddingTop: "4px"}} id="fileUpload" type="file" multiple onChange={this.addFiles}/>
          </Form.Group>
        </div>
        </Form>
        <h4>File List</h4>
        <Form onSubmit={this.handleSubmit}>
          <div style={flexStyle}>
            <Button variant="secondary" onClick={this.handleCancel}>
              Cancel
            </Button>
            <Button variant="warning" disabled={Object.keys(files).includes('newdir')} onClick={this.handleNewDirectory}>
              New Directory
            </Button>
            <Dropdown onSelect={this.handleFormat}>
              <Dropdown.Toggle variant="info" id="dropdown-basic">
                Format
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item eventKey="0">0</Dropdown.Item>
                <Dropdown.Item eventKey="2">2</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Button variant="primary" type="submit">
              Submit
            </Button>
          </div>
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
                <Col sm="2">
                  <Button variant="success" disabled={dirs.includes(key)} href={backend + "/api/download/" + key}>
                    v
                  </Button>
                  <Button variant="primary" disabled={key.endsWith(".zip")} onClick={() => this.handleZip(key)}>
                    z
                  </Button>
                  <Button variant="secondary" disabled={!key.endsWith(".zip") || Object.keys(files).includes(key.replace(/\.zip$/, ""))} onClick={() => this.handleUnzip(key)}>
                    u
                  </Button>
                  <Button variant="danger" disabled={files[key].startsWith("---")} onClick={() => this.handleDelete(key)}>
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
