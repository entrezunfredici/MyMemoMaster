import { mindmapColors } from '@/helpers/themeColors';
import { createId } from '@/helpers/mindmap/mindmap';

// Actions « zones » du store mindmapBuilder (étalées dans `actions`, donc `this` est le store).
// Extrait de stores/mindmapBuilder.js sans changement de comportement.
export const zoneActions = {
  addZone({ name = 'Zone', color = mindmapColors.zone, x = 200, y = 200, width = 360, height = 240 }) {
    const id = createId();
    this.map.zones = Array.isArray(this.map.zones) ? this.map.zones : [];
    this.map.zones.push({
      id,
      name,
      color,
      layout: { x, y, width, height },
      collapsed: false,
    });
    this.touch();
    return id;
  },
  updateZone(id, payload = {}) {
    this.map.zones = Array.isArray(this.map.zones) ? this.map.zones : [];
    const zone = this.map.zones.find((item) => item.id === id);
    if (!zone) return;
    zone.name = payload.name ?? zone.name;
    zone.color = payload.color ?? zone.color;
    if (payload.collapsed !== undefined) {
      zone.collapsed = payload.collapsed;
    }
    if (payload.layout) {
      zone.layout = { ...zone.layout, ...payload.layout };
    }
    this.touch();
  },
  removeZone(id) {
    this.map.zones = (this.map.zones || []).filter((zone) => zone.id !== id);
    Object.values(this.map.nodes).forEach((node) => {
      if (node.zoneId === id) {
        node.zoneId = null;
      }
    });
    this.touch();
  },
  assignNodeToZone(nodeId, zoneId) {
    const node = this.map.nodes[nodeId];
    if (!node) return;
    node.zoneId = zoneId || null;
    this.touch();
  },
};
