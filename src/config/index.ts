import yaml from 'js-yaml'
import fs from 'fs'

const config = yaml.load(fs.readFileSync('src/config/config.yaml', 'utf8'));

export default config
