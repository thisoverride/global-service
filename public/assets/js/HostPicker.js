// Menu déroulant des machines, avec repli sur une saisie libre quand la
// destination n'est pas dans la liste (machine éteinte, IP statique).
export class HostPicker {
  constructor(root = document) {
    root.querySelectorAll('[data-host-picker]').forEach((select) => {
      const custom = select.parentElement.querySelector('[data-host-custom]');
      if (!custom) return;

      const sync = () => {
        const isOther = select.value === '__other__';
        custom.style.display = isOther ? '' : 'none';
        // Sans ça, le navigateur laisse passer un champ « Autre » vide et
        // c'est le serveur qui refuse, après un aller-retour inutile.
        custom.required = isOther;
        if (!isOther) custom.value = '';
      };

      select.addEventListener('change', sync);
      sync();
    });
  }
}
