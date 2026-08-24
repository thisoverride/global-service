import { ModuleManifest } from "../../core/modules/types";

export const manifest: ModuleManifest = {
  id: "qemu",
  name: "QEMU",
  description: "Machines virtuelles (libvirt/KVM)",
  category: "Virtualisation",
  basePath: "/modules/qemu",
  links: [
    { label: "Machines virtuelles", path: "" },
    { label: "Nouvelle VM", path: "new" },
  ],
  icon: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'><path fill='currentColor' d='M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6v2h2v2H8v-2h2v-2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2m0 2v8h16V8H4m2 1h5v5H6V9m6.25 0H14v1.75h-1.75V9m3 0H17v1.75h-1.75V9m-6 3.25h1.75V14H6.25v-1.75m6 0H14V14h-1.75v-1.75m3 0H17V14h-1.75v-1.75'/></svg>`,
};
