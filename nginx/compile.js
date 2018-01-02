const fs = require('fs-extra');
const spawn = require('child_process').spawn;
const readline = require('readline');
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
    (async () => {
        let config = {
            pathToProject: path.resolve(pathToNginxDir+'/../'),
            pathToNginxDir: pathToNginxDir
        };

        if(fs.existsSync(pathToConfig)) {
            fsConfig = require(pathToConfig);
            Object.assign(config, fsConfig);
        }

        if (!config.nginxUser || !config.nginxGroup) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const question = ques => {
                return new Promise(resolve => {
                    rl.question(ques, resolve);
                });
            };

            const askUser = async ques => {
                let answer = await question(ques+'\n');

                if (answer = answer.trim()) {
                    return answer;
                } else {
                    return 'nobody';
                }
            };

            let nginxUser = await askUser('Enter the name of the user who has access to the files in the repository folder:');
            let nginxGroup = await askUser('Enter the user group entered above:');

            rl.close();

            config.nginxUser = nginxUser;
            config.nginxGroup = nginxGroup;
        }

        console.log('Recompilling...');

        let configFile = await fs.readFile(`${pathToNginxDir}/config.conf`);

        configFile = configFile.toString().replace(/(\${([a-z]+)})/gi, (mathed, $1, nameOfReplace) => {
            const toReplace = config[nameOfReplace];
            if(!toReplace) return '';
            return toReplace
        });

        await fs.outputFile(pathToCompiledConfig, configFile);

        runNGINX();
    })();
}
