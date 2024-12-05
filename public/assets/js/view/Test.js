document.addEventListener('DOMContentLoaded', () => {
  const state = {
      isCreatingVM: false
  };

  const elements = {
      createButton: document.querySelector('.section-header .btn-primary'),
      createSection: document.querySelector('.dsn'),
      vmListSection: document.querySelector('.vm-section'),
      formInputs: document.querySelectorAll('.dsn input, .dsn select, .dsn textarea'),
      formButtons: document.querySelectorAll('.dsn button')
  };

  const actions = {
      toggleCreationForm() {
          state.isCreatingVM = !state.isCreatingVM;
          updateUI();
      },

      cancelCreation() {
          state.isCreatingVM = false;
          updateUI();
      }
  };

  function updateUI() {
      if (state.isCreatingVM) {
          elements.createSection.style.display = 'block';
          elements.vmListSection.style.display = 'none';
          enableFormElements();
      } else {
          elements.createSection.style.display = 'none';
          elements.vmListSection.style.display = 'block';
          disableFormElements();
      }
  }

  function disableFormElements() {
      elements.formInputs.forEach(input => input.disabled = true);
      elements.formButtons.forEach(button => button.disabled = true);
  }

  function enableFormElements() {
      elements.formInputs.forEach(input => input.disabled = false);
      elements.formButtons.forEach(button => button.disabled = false);
  }

  elements.createButton.addEventListener('click', actions.toggleCreationForm);
  
  const cancelButton = elements.createSection.querySelector('.btn-secondary');
  if (cancelButton) {
      cancelButton.addEventListener('click', actions.cancelCreation);
  }

  updateUI();
});