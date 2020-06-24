const express = require('express');
const router = express.Router();
const multer = require('multer');
const cache = require( '../lib/cache' );

function getErrorMessage(item) {
  var message = '';
  if(item.error.code == 'LIMIT_FILE_SIZE') {
    message += item.file.originalname + ' must be smaller than 5mb';
  }
  return message;
}

function getUploadedFiles( req, res, next ){

  if( !req.session.uploadId ){
    req.session.uploadId = req.sessionID;
  }

  let files = cache.get( req.session.uploadId );

  if( !files ){
    files = [];
    cache.set( req.session.uploadId, files );
  }

  req.uploadedFiles = files;
  next();
}

router.post('/feedback_answer', function (req, res) {
  let feedback = req.session.data['feedback-res']

  if (feedback === 'yes') {
    res.redirect('/submit_feedback');
  } else {
    res.redirect('https://www.gov.uk/contact-dvsa/y/mot-vehicle-tests-and-approval');
  }
});

router.post('/1_vehicle_details_answer', function (req, res) {
  let feedback = req.session.data['1-is-registered']

  if (feedback === 'yes') {
    res.redirect('/1_vehicle_details_yes');
  } else {
    res.redirect('/1_vehicle_details_no');
  }
});

router.post('/2_vehicle_details_answer', function (req, res) {
  let feedback = req.session.data['2-is-registered']

  if (feedback === 'yes') {
    res.redirect('/2_vehicle_details_yes');
  } else {
    res.redirect('/2_vehicle_details_no');
  }
});

router.post('/alt/hgv_single/vehicle_details_answer', function (req, res) {
  let feedback = req.session.data['1-is-registered']

  if (feedback === 'yes') {
    res.redirect('/alt/hgv_single/vehicle_details_yes');
  } else {
    res.redirect('/alt/hgv_single/vehicle_details_no');
  }
});

router.post('/alt/motorcycle_single_nosup/vehicle_details_answer', function (req, res) {
  let feedback = req.session.data['1-is-registered']

  if (feedback === 'yes') {
    res.redirect('/alt/motorcycle_single_nosup/vehicle_details_yes');
  } else {
    res.redirect('/alt/motorcycle_single_nosup/vehicle_details_no');
  }
});

router.post('/alt/trailer_single_nosup/vehicle_details_answer', function (req, res) {
  let feedback = req.session.data['1-is-registered']

  if (feedback === 'yes') {
    res.redirect('/alt/trailer_single_nosup/vehicle_details_yes');
  } else {
    res.redirect('/alt/trailer_single_nosup/vehicle_details_no');
  }
});

////////////////////////////////////////////////////////////////////////////////////////
// NO JAVASCRIPT
////////////////////////////////////////////////////////////////////////////////////////

const upload = multer( {
  dest: './public/uploads',
  limits: { fileSize: 5000000 },
  fileFilter: function( req, file, cb ){
    let ok = false;

    if(!req.rejectedFiles) {
      req.rejectedFiles = [];
    }

    cb(null, true);
  }
} ).array('documents', 10);



router.get('/components/multi-file-upload', getUploadedFiles, function( req, res ){

  const { uploadedFiles } = req;

  var pageObject = {
    uploadedFiles: [],
    errorMessage: null,
    errorSummary: {
      items: []
    }
  };

  // 1. UPLOADED FILES

  if(uploadedFiles.length) {
    uploadedFiles.forEach(function(file) {
      var o = file;
      o.message = {
        html: `<span class="moj-multi-file-upload__success"> <svg class="moj-banner__icon" fill="currentColor" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" height="25" width="25"><path d="M25,6.2L8.7,23.2L0,14.1l4-4.2l4.7,4.9L21,2L25,6.2z"/></svg> <a href="/${file.path}">${file.originalname}</a> has been uploaded</span>`
      };

      o.filePath = file.path;
      o.originalFileName = file.originalname;
      o.fileName = file.filename;
      o.deleteButton = {
        text: 'Delete'
      };
      pageObject.uploadedFiles.push(o);
    });
  }

  // 2. REJECTED FILES

  if(req.session.rejectedFiles && req.session.rejectedFiles.length) {
    var errorMessage = '';
    req.session.rejectedFiles.forEach(function(item) {
      errorMessage += getErrorMessage(item);
      errorMessage += '<br>';
    });

    req.session.rejectedFiles.forEach(function(item) {
      pageObject.errorSummary.items.push({
        text: getErrorMessage(item),
        href: '#documents'
      });
    });

    pageObject.errorMessage = {
      html: errorMessage
    };
  }

  req.session.rejectedFiles = null;

  res.render( 'components/multi-file-upload/index.html', pageObject );
});

function removeFileFromFileList(fileList, filename) {

  const index = fileList.findIndex( (item ) => item.filename === filename );
  if( index >= 0 ){
    fileList.splice( index, 1 );
  }
}

router.post('/components/multi-file-upload', getUploadedFiles, function( req, res ){
  upload(req, res, function(err) {
    if(err) {
      // console.log(err);
    }

    req.uploadedFiles.push(...req.files);

    if(req.body.delete) {
      removeFileFromFileList(req.uploadedFiles, req.body.delete);
    }

    // no concat because errors are discarded after use anyway
    req.session.rejectedFiles = req.rejectedFiles;

    res.redirect('/components/multi-file-upload');
  });
} );

////////////////////////////////////////////////////////////////////////////////////////
// AJAX
////////////////////////////////////////////////////////////////////////////////////////

const uploadAjax = multer( {
  dest: './public/uploads',
  limits: { fileSize: 5000000 },
  fileFilter: function( req, file, cb ){
    let ok = false;

    return cb(null, true);
  }
} ).single('documents');

router.post('/ajax-upload', getUploadedFiles, function( req, res ){

  uploadAjax(req, res, function(error, val1, val2) {
    if(error) {
      if(error.code == 'LIMIT_FILE_SIZE') {
        // error.message = error.file.originalname + ' must be smaller than 5mb';
        error.message = 'The file must be smaller than 5mb';
      }

      var response = {
        error: error,
        file: error.file || { filename: 'filename', originalname: 'originalname' }
      };

      res.json(response);
    } else {

      req.uploadedFiles.push(req.file);

      res.json({
        file: req.file,
        success: {
          messageHtml: `<a href="${req.file.path}" class="govuk-link"> ${req.file.originalname}</a> has been uploaded`,
          messageText: `${req.file.originalname} has been uploaded`
        }
      });
    }
  } );
} );

router.post('/ajax-delete', getUploadedFiles, function( req, res ){
  removeFileFromFileList(req.uploadedFiles, req.body.delete);
  res.json({});
});

module.exports = router;