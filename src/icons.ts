import path from 'path';

const getIconPath = (fileName: string): string =>
  path.join(__dirname, '..', 'media', fileName);

export default {
  building: getIconPath('building.png'),
  enqueued: getIconPath('building.png'),
  loading: getIconPath('loading.png'),
  new: getIconPath('building.png'),
  processing: getIconPath('building.png'),
  ready: getIconPath('ready.png')
};
