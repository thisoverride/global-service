import { ModuleManifest } from "../../core/modules/types";

export const manifest: ModuleManifest = {
  id: "smarthink",
  name: "Smarthink",
  description: "Webcam, son et supervision de la seconde machine",
  category: "Machines",
  basePath: "/modules/smarthink",
  links: [
    { label: "Direct", path: "" },
    { label: "Enregistrements", path: "recordings" },
  ],
  icon: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'><path fill='currentColor' d='M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11zM5 8h2v2H5z'/></svg>`,
};
