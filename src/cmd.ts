import fs from 'fs/promises';
import path from 'path';
import displayCommandsHelp from './components/Help';

fs.writeFile(path.join(__dirname, '../data/command.txt'), displayCommandsHelp(true));