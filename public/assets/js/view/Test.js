document.addEventListener('DOMContentLoaded', () => {
    try {
      // Récupérer les éléments initiaux
      const form = document.getElementById('form-details');
      const overview = document.getElementById('overview');
      const root = document.getElementById('root');
      const createButton = overview.querySelector('.btn-primary');
  
      // Vérifier si tous les éléments existent
      if (!form || !overview || !root || !createButton) {
        throw new Error('Un ou plusieurs éléments DOM requis sont manquants');
      }
  
      // Sauvegarder une copie de l'overview pour pouvoir le restaurer
      const overviewSection = overview.cloneNode(true);
      
      // Par défaut, on retire le formulaire du DOM
      form.remove();
  
      // Fonction pour revenir à l'overview
      const returnToOverview = () => {
        try {
          // On vide le root
          while (root.firstChild) {
            root.firstChild.remove();
          }
          
          // On recrée une copie fraîche de l'overview
          const newOverview = overviewSection.cloneNode(true);
          
          // On réattache l'événement au bouton créer
          const newCreateButton = newOverview.querySelector('.btn-primary');
          newCreateButton.addEventListener('click', showForm);
          
          // On ajoute l'overview au DOM
          root.appendChild(newOverview);
          
          console.log('Retour à l\'overview effectué avec succès');
        } catch (error) {
          console.error('Erreur lors du retour à l\'overview:', error.message);
        }
      };
  
      // Fonction pour afficher le formulaire
      const showForm = () => {
        try {
          // Créer une copie du formulaire
          const formSection = form.cloneNode(true);
          
          // Ajouter l'événement sur le bouton reset
          const resetButton = formSection.querySelector('button[type="reset"]');
          if (resetButton) {
            resetButton.addEventListener('click', (e) => {
              e.preventDefault(); // Empêcher le reset par défaut
              returnToOverview();
            });
          }
          
          // Supprimer le contenu actuel
          while (root.firstChild) {
            root.firstChild.remove();
          }
          
          // Ajouter le formulaire
          root.appendChild(formSection);
          
          console.log('Basculement vers le formulaire effectué avec succès');
        } catch (error) {
          console.error('Erreur lors du basculement vers le formulaire:', error.message);
        }
      };
  
      // Attacher l'événement au bouton créer initial
      createButton.addEventListener('click', showForm);
  
      console.log('Interface initialisée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error.message);
    }
  });