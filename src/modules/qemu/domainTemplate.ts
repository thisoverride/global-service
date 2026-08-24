export interface DomainParams {
  name: string;
  vcpus: number;
  memoryMiB: number;
  diskPath: string;
  seedIsoPath: string;
}

// Gabarit XML libvirt minimal (KVM, virtio, VNC en local uniquement — pas de
// virt-install/osinfo-db necessaire). "name" est valide en amont (routes.ts)
// comme un slug [a-z0-9-], donc pas d'echappement XML a faire dessus.
export function buildDomainXml(p: DomainParams): string {
  return `<domain type='kvm'>
  <name>${p.name}</name>
  <memory unit='MiB'>${p.memoryMiB}</memory>
  <currentMemory unit='MiB'>${p.memoryMiB}</currentMemory>
  <vcpu placement='static'>${p.vcpus}</vcpu>
  <os>
    <type arch='x86_64' machine='q35'>hvm</type>
    <boot dev='hd'/>
  </os>
  <features>
    <acpi/>
    <apic/>
  </features>
  <cpu mode='host-model'/>
  <clock offset='utc'/>
  <on_poweroff>destroy</on_poweroff>
  <on_reboot>restart</on_reboot>
  <on_crash>destroy</on_crash>
  <devices>
    <emulator>/usr/bin/qemu-system-x86_64</emulator>
    <disk type='file' device='disk'>
      <driver name='qemu' type='qcow2'/>
      <source file='${p.diskPath}'/>
      <target dev='vda' bus='virtio'/>
    </disk>
    <disk type='file' device='cdrom'>
      <driver name='qemu' type='raw'/>
      <source file='${p.seedIsoPath}'/>
      <target dev='sda' bus='sata'/>
      <readonly/>
    </disk>
    <interface type='network'>
      <source network='default'/>
      <model type='virtio'/>
    </interface>
    <graphics type='vnc' port='-1' autoport='yes' listen='127.0.0.1'/>
    <console type='pty'/>
  </devices>
</domain>
`;
}
