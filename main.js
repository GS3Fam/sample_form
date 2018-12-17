const electron = require('electron');
const url = require('url');
const path = require('path');
const fs= require('fs');
const file = './form_data/';
const mongoose = require('mongoose');

var db = mongoose.connection;
var connection;
var db_online = 'mongodb://jairo_form:mngvPS5PqDNw4PW@ds139198.mlab.com:39198/db_test2';
mongoose.connect(db_online);
db.on('error', console.error.bind(console, 'connection error:'));

const{app, BrowserWindow, Menu, ipcMain} = electron;

let mainWindow;
let addWindow;

app.on('ready', function(){
    mainWindow = new BrowserWindow({

    });

    //load html
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'views/index.html'),
        protocol: 'file',
        slashes: true
    }));

    mainWindow.on('closed', function(){
        app.quit();
    });

    //build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    //Insert menu
    Menu.setApplicationMenu(mainMenu);
});

// ======================================= SCHEMA ================================================= //
var dataSchema = new mongoose.Schema({
    form_id: String,
    Customer: String,
    Transaction: String,
    data: Array 
});
// ====================================== ERROR HANDLING ============================ //
function handleError(error){
    console.log(error);
}
//======================================= ONLINE =================================== //
var formSchema = new mongoose.Schema({
    appId : String,
    _app : {
        appId : String,
        caption : String,
        image : String,
        sequence : Number,
        status : Boolean,
        access : String,
        customhtml : String,
        mobileCheck : Boolean,
        mobileKeyRef1 : String,
        mobileKeyRef2 : String
    },
    columns : []
});

// =========================================== LIST OF FORM ============================================ //
var form_list = mongoose.model('Form_data', formSchema);
var json_files = [];
ipcMain.on('list_files', (event, arg, con) => {
    // check if the connection is the same
    // if(con == connection){
    //     console.log('same');
    // }
    // else{
    //     connection = con;
    // }
    connection = con;
    json_files = [];
    if(con == true){
        mongoose.connect(db_online);
        db.on('error', console.error.bind(console, 'connection error:'));

        try{
            form_list.find(function (err, form_list) {
                if (err) return handleError(err);
                form_list.forEach(element => {
                    const path_send = element.appId;
                    const app_name = element._app.caption;
                    const app_id = element._app.appId;
                    const array = { path_send, app_name, app_id };
                    json_files.push(array);
                });
                event.sender.send('list_files', json_files);
            });
        }
        catch(error){
            console.log(error);
        }
    }
    else if(con == false){
        // offline
        try{
            fs.readdir(path.join(__dirname, 'form_data'), (err, dir) => {
                if (err) return handleError(err);
                json_files = [];
                for (var i = 0, path; path = dir[i]; i++) {
                    var file_type = path.substr(path.length - 5);
                    if(file_type === '.json'){
                        const path_send = path;
                        const config_name = require(file + path);
                        const app_name = config_name._app.caption;
                        const app_id = config_name._app.appId;
                        const array = { path_send, app_name, app_id }
                        json_files.push(array);
                    }
                }
                event.sender.send('list_files', json_files)
            });
        }
        catch(error){
            console.log(error);
        }
    }
});

// ========================================== DISPLAY FORM ============================================== //
ipcMain.on('upload-json', (event, arg, app_id) => {
    // console.log(arg);
    // console.log(app_id);
    // console.log(connection);
    if(connection){
        try{
            var form = mongoose.model('Form_data', formSchema);
            form.find({'appId' : app_id}, function (err, config){
                if (err) return handleError(err);

                var data = mongoose.model('Data', dataSchema);

                data.find({'Transaction': app_id}, function (err, data) {
                    if (err) return handleError(err);
                    event.sender.send('upload-json', config[0]._doc, data);
                });
            });
        }
        catch(error){
            console.log(error);
        }
    }
    else if(connection == false){
        const config = require(file + arg);
        if(connection){
            var data = mongoose.model('Data', dataSchema);

            data.find({'Transaction': app_id}, function (err, data) {
                if (err) return handleError(err);
                event.sender.send('upload-json', config, data);
            });
        }
        else{
            event.sender.send('upload-json', config, data);
        }
    }
});

// ========================================= SUBMIT FORM ========================================= //
ipcMain.on('send-data', (event, arg) => {
    // console.log(arg.data);
    function makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    
        for (var i = 0; i < 25; i++){
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    if(connection){
        var data = mongoose.model('Data', dataSchema);

        var inputs = new data({
            form_id: makeid(), Customer: arg.Customer, Transaction: arg.Transaction, data: arg.data
        });

        inputs.save(function (err, inputs){
            if(err) return console.error(err);
            mongoose.deleteModel('Data');  
            console.log('save');
        });

        var file_name = makeid();
        fs.writeFile('data/'+file_name+'.json', JSON.stringify(arg), function (err){
            if (err) throw err;
            console.log('saved locally');
        });

        event.sender.send('saved-indicator', true);
    }
    else{
        // console.log(JSON.stringify(arg));
        var file_name = makeid();
        fs.writeFile('data/'+file_name+'.json', JSON.stringify(arg), function (err){
            if (err) throw err;

            console.log('saved locally');
        })
        event.sender.send('saved-indicator', true);
    }
});

// =============== offline ========================== //

// ipcMain.on('upload-json', (event, arg, app_id) => {
//     // console.log(arg) // prints "ping"
    
// });

// ============================================ FUNCTION WINDOWS ======================================== //
function createNew(){
    // create new window
    addWindow = new BrowserWindow({
        width: 300,
        height: 200,
        title: 'Select File'
    });
    // Load html
    addWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'views/select.html'),
        protocol: 'file',
        slashes: true
    }));
    //Garbage Collection
    addWindow.on('closed', function(){
        addWindow = null;
    });
}

const mainMenuTemplate = [
    {
        label: 'File',
        submenu:[
            {
                label: 'Select File',
                click(){
                    createNew();
                }

            }
        ]
    }
];

// If mac, add empty object
if(process.platform == 'darwin'){
    mainMenuTemplate.unshift({});
}

// add developer tools if not in production
if(process.env.NODE_ENV !== 'production'){
    mainMenuTemplate.push({
        label: 'Developer Tools',
        submenu: [
            {
                label: 'Toogle Devtools',
                accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
                click(item, focusedWindow){
                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    });
}