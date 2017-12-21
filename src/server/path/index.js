import { accessSync, R_OK } from 'fs';
import { find } from 'lodash';
import { fromRoot } from '../../utils';

const CONFIG_PATHS = [
  process.env.CONFIG_PATH,
  fromRoot('config/investigate.yml') // kibi: use kibi configuration file
  //'/etc/kibana/kibana.yml' kibi: no such config location in kibi
].filter(Boolean);

// kibi: use '/var/lib/kibi'
const DATA_PATHS = [
  process.env.DATA_PATH,
  fromRoot('data'),
  '/var/lib/kibi'
].filter(Boolean);

// kibi
const kibiYmlPath = fromRoot('config/kibi.yml');
function checkKibiYmlExists() {
  try {
    accessSync(kibiYmlPath);
    return true;
  } catch(e) {
    return false;
  }
}

function getConfig() {
  if(checkKibiYmlExists()) {
    throw new Error(`kibi.yml found in config folder. Please run bin/kibi upgrade-config to migrate your kibi.yml to investigate.yml
       Please be aware that this command removes all comments in the kibi.yml
       but the original file (with comments) is preserved as kibi.yml.pre10\n`);
  } else {
    return findFile(CONFIG_PATHS);
  }
}

// kibi:end

function findFile(paths) {
  const availablePath = find(paths, configPath => {
    try {
      accessSync(configPath, R_OK);
      return true;
    } catch (e) {
      //Check the next path
    }
  });
  return availablePath || paths[0];
}

export default {
  getConfig, // kibi: check if kibi.yml exists and migrate if so
  getData: () => findFile(DATA_PATHS)
};
