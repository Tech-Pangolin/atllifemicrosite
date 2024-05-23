

(function () {
  "use strict";

  let forms = document.querySelectorAll('.contact-form');

  forms.forEach( function(e) {
    e.addEventListener('submit', function(event) {
      event.preventDefault();

      let thisForm = this;

      thisForm.querySelector('.loading').classList.add('d-block');
      thisForm.querySelector('.error-message').classList.remove('d-block');
      thisForm.querySelector('.sent-message').classList.remove('d-block');

      let formData = new FormData( thisForm );
      let dataObj = {};
      formData.entries().forEach( (ary) => dataObj[ary[0]] = ary[1]);

      try {
        // submit form in here
        $.ajax({
          url: 'https://us-central1-greywebsupportfxns.cloudfunctions.net/submitForm',
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify(dataObj),
          success: function() {
            thisForm.querySelector('.loading').classList.remove('d-block');
            thisForm.querySelector('.sent-message').classList.add('d-block');
            thisForm.reset(); 
          },
          error: function(xhr, textStatus, errorThrown) {
            displayError(thisForm, errorThrown);
          }
        })
      } catch (error) {
        displayError(thisForm, new Error('Form submission failed!'));
      }
    });
  });

  function displayError(thisForm, error) {
    thisForm.querySelector('.loading').classList.remove('d-block');
    thisForm.querySelector('.error-message').innerHTML = error;
    thisForm.querySelector('.error-message').classList.add('d-block');
  }

})();
