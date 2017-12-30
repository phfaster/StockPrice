const fs = require('fs-extra');
const spawn = require('child_process').spawn;
const path = require('path');
const pathToNginxDir = __dirname;
const pathToConfig = `${pathToNginxDir}/config.json`;
const pathToPID = `${pathToNginxDir}/nginx.pid`;
const pathToCompiledConfig = `${pathToNginxDir}/compiled-config.conf`;
const cmd = process.argv[2];

if(process.getuid()) {
    console.error('No permissions for run nginx.');
    process.exit(0)
}

const runNGINX = () => {
    const arguments = ['-c', pathToCompiledConfig];

    if(cmd && cmd === 'stop') {
        console.log('Stopping nginx...');
        arguments.push('-s', cmd);
    }
    else if(fs.pathExistsSync(pathToPID)) {
        console.log('Reloading nginx...');
        arguments.push('-s', 'reload');
    }
    
    console.log('nginx command:', 'nginx '+arguments.join(' '));

    const nginx = spawn('nginx', arguments);

    nginx.stdout.on('data', (data) => {
        console.log(`[nginx]: ${data}`);
    });

    nginx.stderr.on('data', (data) => {
        console.error(`[nginx]: ${data}`);
    });

    nginx.on('close', (code) => {
        if(code !== 0) console.log(`nginx process exited with code ${code}`);
        else console.log('All good:)');
    });

    return nginx;
};

if(fs.existsSync(pathToCompiledConfig) && cmd !== 'recompile' && cmd !== 'rc') {
    runNGINX()
}
else {
    let config = {
        nginxUser: 'nobody',
        nginxGroup: 'nobody',
        pathToProject: path.resolve(pathToNginxDir+'/../'),
        pathToNginxDir: pathToNginxDir
    };

    if(fs.existsSync(pathToConfig)) {
        fsConfig = require(pathToConfig);
        Object.assign(config, fsConfig);
    }

    console.log('Recompilling...');

    fs
        .readFile(`${pathToNginxDir}/config.conf`)
        .then(configFile => {
            configFile = configFile.toString().replace(/(\${([a-z]+)})/gi, (mathed, $1, nameOfReplace) => {
                const toReplace = config[nameOfReplace];
                if(!toReplace) return '';
                return toReplace
            });

            return fs.outputFile(pathToCompiledConfig, configFile)
        })
        .then(() => runNGINX())
        .catch(err => {
            console.error(err)
        })
}
