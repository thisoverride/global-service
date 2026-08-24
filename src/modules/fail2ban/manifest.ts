import { ModuleManifest } from "../../core/modules/types";

export const manifest: ModuleManifest = {
  id: "fail2ban",
  name: "Fail2ban",
  description: "Bannissements et surveillance des intrusions",
  category: "Système",
  basePath: "/modules/fail2ban",
  icon: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'><path fill='currentColor' d='M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91c4.59-1.15 8-5.86 8-10.91V5zm0 2.18l6 2.25v4.66c0 4-2.55 7.7-6 8.83c-3.45-1.13-6-4.82-6-8.83V6.43zM11 7v6h2V7zm0 8v2h2v-2z'/></svg>`,
};
