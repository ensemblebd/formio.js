import { BaseComponent } from '../base/Base';
import FormioUtils from '../../utils';
import Formio from '../../formio';

export class FileComponent extends BaseComponent {
  constructor(component, options, data) {
    super(component, options, data);
    this.support = {
      filereader: typeof FileReader != 'undefined',
      dnd: 'draggable' in document.createElement('span'),
      formdata: !!window.FormData,
      progress: "upload" in new XMLHttpRequest
    };
  }

  getValue() {
    return this.data[this.component.key];
  }

  setValue(value) {
    this.data[this.component.key] = value;
    this.refreshDOM();
  }

  build() {
    // Set default to empty array.
    this.setValue([]);

    this.createElement();
    this.createLabel(this.element);
    this.errorContainer = this.element;
    this.createErrorElement();
    this.listContainer = this.buildList();
    this.element.appendChild(this.listContainer);
    this.uploadContainer = this.buildUpload();
    this.element.appendChild(this.uploadContainer);
    this.addWarnings(this.element);
    this.buildUploadStatusList(this.element);
  }

  refreshDOM() {
    // Don't refresh before the initial render.
    if (this.listContainer && this.uploadContainer) {
      // Refresh file list.
      const newList = this.buildList();
      this.element.replaceChild(newList, this.listContainer);
      this.listContainer = newList;

      // Refresh upload container.
      const newUpload = this.buildUpload();
      this.element.replaceChild(newUpload, this.uploadContainer);
      this.uploadContainer = newUpload;
    }
  }

  buildList() {
    if (this.component.image) {
      return this.buildImageList();
    }
    else {
      return this.buildFileList();
    }
  }

  buildFileList() {
    return this.ce('filelist', 'ul', {class: 'list-group list-group-striped'}, [
      this.ce('fileheader', 'li', {class: 'list-group-item list-group-header hidden-xs hidden-sm'},
        this.ce('fileheaderrow', 'div', {class: 'row'},
          [
            this.ce('deletecol', 'div', {class: 'col-md-1'}),
            this.ce('filecol', 'div', {class: 'col-md-9'},
              this.ce('bold', 'strong', {}, 'File Name')
            ),
            this.ce('sizecol', 'div', {class: 'col-md-2'},
              this.ce('bold', 'strong', {}, 'Size')
            )
          ]
        )
      ),
      this.data[this.component.key].map((fileInfo, index) => this.createFileListItem(fileInfo, index))
    ]);
  }

  createFileListItem(fileInfo, index) {
    return this.ce('fileinforow', 'li', {class: 'list-group-item'},
      this.ce('fileheaderrow', 'div', {class: 'row'},
        [
          this.ce('deletecol', 'div', {class: 'col-md-1'},
            this.ce('deleteSpan', 'span', {class: 'glyphicon glyphicon-remove'}, null, {
              click: event => {
                event.preventDefault();
                this.data[this.component.key].splice(index, 1);
                this.refreshDOM();
                this.triggerChange();

              }
            })
          ),
          this.ce('filecol', 'div', {class: 'col-md-9'}, this.createFileLink(fileInfo)),
          this.ce('sizecol', 'div', {class: 'col-md-2'}, this.fileSize(fileInfo.size))
        ]
      )
    )
  }

  createFileLink(file) {
    return this.ce('filelink', 'a', {href: file.url, target: '_blank'}, file.name, {
      click: this.getFile.bind(this, file)
    });
  }

  buildImageList() {
    let list = this.ce('imagelist', 'div');
    list.innerHTML = 'Image list coming soon...';
    return list;
  }

  buildUpload() {
    // Drop event must change this pointer so need a reference to parent this.
    const element = this;
    // If this is disabled or a single value with a value, don't show the upload div.
    return this.ce('uploadwrapper', 'div', {},
      (
        (!this.disabled && (this.component.multiple || this.data[this.component.key].length === 0)) ?
          this.ce('upload', 'div', {class: 'fileSelector'},
            [
              this.ce('icon', 'i', {class: 'glyphicon glyphicon-cloud-upload'}),
              this.text(' Drop files to attach, or '),
              this.ce('browse', 'a', false, 'browse', {
                click: event => {
                  event.preventDefault();
                  // There is no direct way to trigger a file dialog. To work around this, create an input of type file and trigger
                  // a click event on it.
                  let input = this.ce('fileinput', 'input', {type: 'file'});
                  // Trigger a click event on the input.
                  if (typeof input.trigger === 'function') {
                    input.trigger('click');
                  }
                  else {
                    input.click();
                  }
                  input.addEventListener('change', () => {this.upload(input.files)});
                }
              })
            ],
            {
              dragover: function (event) {
                this.className = 'fileSelector fileDragOver';
                event.preventDefault();
              },
              dragleave: function (event) {
                this.className = 'fileSelector';
                event.preventDefault();
              },
              drop: function(event) {
                this.className = 'fileSelector';
                event.preventDefault();
                element.upload(event.dataTransfer.files);
                return false;
              }
            }
          ) :
          this.ce('uploadwrapper', 'div')
      )
    );
  }

  buildUploadStatusList(container) {
    let list = this.ce('uploadlist', 'div');
    this.uploadStatusList = list;
    container.appendChild(list);
  }

  addWarnings(container) {
    let hasWarnings = false;
    let warnings = this.ce('warnings', 'div', {class: 'alert alert-warning'});
    if (!this.component.storage) {
      hasWarnings = true;
      warnings.appendChild(this.ce('nostorage', 'p').appendChild(this.text('No storage has been set for this field. File uploads are disabled until storage is set up.')));
    }
    if (!this.support.dnd) {
      hasWarnings = true;
      warnings.appendChild(this.ce('nodnd', 'p').appendChild(this.text('FFile Drag/Drop is not supported for this browser.')));
    }
    if (!this.support.filereader) {
      hasWarnings = true;
      warnings.appendChild(this.ce('nofilereader', 'p').appendChild(this.text('File API & FileReader API not supported.')));
    }
    if (!this.support.formdata) {
      hasWarnings = true;
      warnings.appendChild(this.ce('noformdata', 'p').appendChild(this.text('XHR2\'s FormData is not supported.')));
    }
    if (!this.support.progress) {
      hasWarnings = true;
      warnings.appendChild(this.ce('noprogress', 'p').appendChild(this.text('XHR2\'s upload progress isn\'t supported.')));
    }
    if (hasWarnings) {
      container.appendChild(warnings);
    }
  }

  fileSize(a, b, c, d, e) {
    return (b = Math, c = b.log, d = 1024, e = c(a) / c(d) | 0, a / b.pow(d, e)).toFixed(2) + ' ' + (e ? 'kMGTPEZY'[--e] + 'B' : 'Bytes');
  };

  createUploadStatus(fileUpload) {
    let container;
    return container = this.ce('uploadstatus', 'div', {class: 'file' + (fileUpload.status === 'error' ? ' has-error' : '')}, [
      this.ce('filerow', 'div', {class: 'row'}, [
          this.ce('filecell', 'div', {class: 'fileName control-label col-sm-10'}, [
            fileUpload.name,
            this.ce('removefile', 'span', {class: 'glyphicon glyphicon-remove'}, undefined, {
              click: () => {this.uploadStatusList.removeChild(container)}
            })
          ]),
          this.ce('sizecell', 'div', {class: 'fileSize control-label col-sm-2 text-right'}, this.fileSize(fileUpload.size))
        ]),
      this.ce('statusrow', 'div', {class: 'row'}, [
        this.ce('progresscell', 'div', {class: 'col-sm-12'}, [
          (fileUpload.status === 'progress' ?
            this.ce('progresscell', 'div', {class: 'progress'},
              this.ce('progressbar', 'div', {
                class: 'progress-bar',
                role: 'progressbar',
                'aria-valuenow': fileUpload.progress,
                'aria-valuemin': 0,
                'aria-valuemax': 100,
                style: 'width:' + fileUpload.progress + '%'
              },
                this.ce('srprogress', 'span', {class: 'sr-only'}, fileUpload.progress + '% Complete')
              )
            ) :
            this.ce('messagecell', 'div', {class: 'bg-' + fileUpload.status}, fileUpload.message)
          )
        ])
      ])
    ]);
  }

  upload(files) {
    if (this.component.storage && files && files.length) {
      // files is not really an array and does not have a forEach method, so fake it.
      Array.prototype.forEach.call(files, file => {
        // Get a unique name for this file to keep file collisions from occurring.
        const fileName = FormioUtils.uniqueName(file.name);
        let fileUpload = {
          name: fileName,
          size: file.size,
          status: 'info',
          message: 'Starting upload'
        };
        const dir = this.interpolate(this.component.dir || '', {data: this.data, row: this.row});
        let formio = null;
        if (this.options.formio) {
          formio = this.options.formio;
        }
        else {
          fileUpload.status = 'error';
          fileUpload.message = 'File Upload URL not provided.';
        }

        let uploadStatus = this.createUploadStatus(fileUpload);
        this.uploadStatusList.appendChild(uploadStatus);

        if (formio) {
          formio.uploadFile(this.component.storage, file, fileName, dir, evt => {
            fileUpload.status = 'progress';
            fileUpload.progress = parseInt(100.0 * evt.loaded / evt.total);
            delete fileUpload.message;
            const originalStatus = uploadStatus;
            uploadStatus = this.createUploadStatus(fileUpload);
            this.uploadStatusList.replaceChild(uploadStatus, originalStatus);
          }, this.component.url)
          .then(fileInfo => {
            this.uploadStatusList.removeChild(uploadStatus);
            this.data[this.component.key].push(fileInfo);
            this.refreshDOM();
            this.triggerChange();
          })
          .catch(response => {
            fileUpload.status = 'error';
            fileUpload.message = response;
            delete fileUpload.progress;
            const originalStatus = uploadStatus;
            uploadStatus = this.createUploadStatus(fileUpload);
            this.uploadStatusList.replaceChild(uploadStatus, originalStatus);
          });
        }
      });
    }
  }

  getFile(fileInfo, event)  {
    if (!this.options.formio) {
      return alert('File URL not set');
    }
    this.options.formio
      .downloadFile(fileInfo).then(function(file) {
        if (file) {
          window.open(file.url, '_blank');
        }
      })
      .catch(function(response) {
        // Is alert the best way to do this?
        // User is expecting an immediate notification due to attempting to download a file.
        alert(response);
      });
    event.preventDefault();
  }
}