  //   // État de l'application
  //   let state = {
  //     currentSection: 'dashboard',
  //     applications: [],
  //     templates: [],
  //     services: {
  //         expanded: false
  //     }
  // };

  // // Gestionnaire de services
  // document.getElementById('servicesButton').addEventListener('click', (e) => {
  //     e.stopPropagation();
  //     toggleServices();
  // });

  // document.addEventListener('click', (e) => {
  //     if (!e.target.closest('.services-panel') && !e.target.closest('.services-button')) {
  //         closeServices();
  //     }
  // });

  // // Recherche de services
  // document.getElementById('serviceSearch').addEventListener('input', (e) => {
  //     const searchTerm = e.target.value.toLowerCase();
  //     const serviceItems = document.querySelectorAll('.service-category .nav-item');
      
  //     serviceItems.forEach(item => {
  //         const text = item.textContent.toLowerCase();
  //         const category = item.closest('.service-category');
  //         item.style.display = text.includes(searchTerm) ? '' : 'none';

  //         // Gestion de l'affichage des catégories
  //         if (category) {
  //             const visibleItems = Array.from(category.querySelectorAll('.nav-item')).some(
  //                 item => item.style.display !== 'none'
  //             );
  //             category.style.display = visibleItems ? '' : 'none';
  //         }
  //     });
  // });

  // // Navigation
  // document.querySelectorAll('.nav-item').forEach(item => {
  //     item.addEventListener('click', () => {
  //         const section = item.getAttribute('href').substring(1);
  //         changeSection(section);
  //     });
  // });

  // // Gestionnaire des modales
  // function openModal(modalId) {
  //     document.getElementById(modalId).classList.add('active');
  // }

  // function closeModal(modalId) {
  //     document.getElementById(modalId).classList.remove('active');
  // }

  // // Fonctions utilitaires
  // function toggleServices() {
  //     const panel = document.getElementById('servicesPanel');
  //     state.services.expanded = !state.services.expanded;
  //     panel.classList.toggle('active', state.services.expanded);
      
  //     if (state.services.expanded) {
  //         document.getElementById('serviceSearch').focus();
  //     }
  // }

  // function closeServices() {
  //     state.services.expanded = false;
  //     document.getElementById('servicesPanel').classList.remove('active');
  // }

  // function changeSection(sectionId) {
  //     state.currentSection = sectionId;
      
  //     // Mise à jour de la navigation
  //     document.querySelectorAll('.nav-item').forEach(item => {
  //         const href = item.getAttribute('href');
  //         if (href) {
  //             item.classList.toggle('active', href === `#${sectionId}`);
  //         }
  //     });

  //     // Mise à jour du contenu
  //     document.querySelectorAll('main > section').forEach(section => {
  //         section.style.display = section.id === sectionId ? 'block' : 'none';
  //     });
  // }

  // // Gestion des applications
  // function saveNewApp() {
  //     const name = document.getElementById('appName').value;
  //     const description = document.getElementById('appDescription').value;
  //     const status = document.getElementById('appStatus').value;

  //     if (!name) return;

  //     const newApp = {
  //         id: `app-${Date.now()}`,
  //         name,
  //         description,
  //         status,
  //         created: new Date().toISOString()
  //     };

  //     state.applications.push(newApp);
  //     closeModal('newAppModal');
  //     refreshApplicationsList();
  // }

  // // Gestion des templates
  // function saveNewTemplate() {
  //     const name = document.getElementById('templateName').value;
  //     const type = document.getElementById('templateType').value;
  //     const appId = document.getElementById('templateApp').value;

  //     if (!name || !appId) return;

  //     const newTemplate = {
  //         id: `template-${Date.now()}`,
  //         name,
  //         type,
  //         appId,
  //         created: new Date().toISOString()
  //     };

  //     state.templates.push(newTemplate);
  //     closeModal('newTemplateModal');
  //     refreshTemplatesList();
  // }

  // // Mise à jour des listes
  // function refreshApplicationsList() {
  //     const tableBody = document.querySelector('#applicationsList tbody');
  //     if (!tableBody) return;

  //     tableBody.innerHTML = state.applications.map(app => `
  //         <tr>
  //             <td>${app.name}</td>
  //             <td><span class="badge badge-${app.status}">${app.status}</span></td>
  //             <td>${new Date(app.created).toLocaleDateString()}</td>
  //             <td>
  //                 <button class="btn" onclick="editApplication('${app.id}')">
  //                     <i class="fas fa-edit"></i>
  //                 </button>
  //                 <button class="btn" onclick="deleteApplication('${app.id}')">
  //                     <i class="fas fa-trash"></i>
  //                 </button>
  //             </td>
  //         </tr>
  //     `).join('');
  // }

  // function refreshTemplatesList() {
  //     const tableBody = document.querySelector('#templatesList tbody');
  //     if (!tableBody) return;

  //     tableBody.innerHTML = state.templates.map(template => `
  //         <tr>
  //             <td>${template.name}</td>
  //             <td><span class="badge badge-${template.type}">${template.type}</span></td>
  //             <td>${new Date(template.created).toLocaleDateString()}</td>
  //             <td>
  //                 <button class="btn" onclick="editTemplate('${template.id}')">
  //                     <i class="fas fa-edit"></i>
  //                 </button>
  //                 <button class="btn" onclick="deleteTemplate('${template.id}')">
  //                     <i class="fas fa-trash"></i>
  //                 </button>
  //             </td>
  //         </tr>
  //     `).join('');
  // }

  // // Initialisation
  // document.addEventListener('DOMContentLoaded', () => {
  //     changeSection('dashboard');
  //     refreshApplicationsList();
  //     refreshTemplatesList();
  // });


  let vms = [
    {
        id: 'vm-1',
        name: 'Production Server',
        type: 't2.medium',
        image: 'ubuntu20',
        status: 'running',
        ip: '172.16.0.10',
        storage: 50,
        created: '2024-01-15'
    },
    {
        id: 'vm-2',
        name: 'Development Server',
        type: 't2.micro',
        image: 'debian11',
        status: 'stopped',
        ip: '172.16.0.11',
        storage: 20,
        created: '2024-02-01'
    }
];

// Rendu des VMs
function renderVMs(filteredVMs = vms) {
    const grid = document.getElementById('vmGrid');
    grid.innerHTML = filteredVMs.map(vm => `
        <div class="vm-card">
            <div class="vm-status status-${vm.status}"></div>
            <div class="vm-header">
                <div class="vm-name">${vm.name}</div>
                <div class="vm-id">${vm.id}</div>
            </div>
            <div class="vm-details">
                <span class="vm-detail-label">Type:</span>
                <span class="vm-detail-value">${vm.type}</span>
                <span class="vm-detail-label">Image:</span>
                <span class="vm-detail-value">${vm.image}</span>
                <span class="vm-detail-label">IP:</span>
                <span class="vm-detail-value">${vm.ip}</span>
                <span class="vm-detail-label">Stockage:</span>
                <span class="vm-detail-value">${vm.storage} GB</span>
            </div>
            <div class="vm-actions">
                ${vm.status === 'stopped' ? `
                    <button class="vm-action-btn power" onclick="startVM('${vm.id}')">
                        <i class="fas fa-power-off"></i>
                    </button>
                ` : `
                    <button class="vm-action-btn stop" onclick="stopVM('${vm.id}')">
                        <i class="fas fa-power-off"></i>
                    </button>
                `}
                <button class="vm-action-btn restart" onclick="restartVM('${vm.id}')">
                    <i class="fas fa-sync"></i>
                </button>
                <button class="vm-action-btn" onclick="editVM('${vm.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="vm-action-btn" onclick="deleteVM('${vm.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    renderVMs(vms)
}