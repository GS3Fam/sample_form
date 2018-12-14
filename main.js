const electron = require('electron');
const url = require('url');
const path = require('path');
const fs= require('fs');
const file = './form_data/';
const mongoose = require('mongoose');

var db = mongoose.connection;

mongoose.connect('mongodb://jairo_form:mngvPS5PqDNw4PW@ds139198.mlab.com:39198/db_test2');

db.once('open', function() {
   console.log('connected');
});

var json_files = [];

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
setInterval(function () {
},1000);

// offline
fs.readdir(path.join(__dirname, 'form_data'), (err, dir) => {
    //const config_name = require(file + arg);
    // console.log(config_name.columns);
    for (var i = 0, path; path = dir[i]; i++) {
        var file_type = path.substr(path.length - 5);
        if(file_type === '.json'){
            const config_name = require(file + path);
            const app_name = config_name._app.caption;
            const app_id = config_name._app.appId;
            const array = { path, app_name, app_id }
            json_files.push(array);
        }
    }
    // console.log(json_files);
    // console.log(json_files);
    console.log(json_files);
    ipcMain.on('list_files', (event, arg) => {
        // console.log(arg) // prints "ping"
        event.sender.send('list_files', json_files)
    });
    // mainWindow.webContents.send('list_files', json_files);
});

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

var form_list = mongoose.model('Form_data', formSchema);

// var inputs_form = new form_list({   
//     appId: '10', _app : _app_array, columns: column_data
// });

// inputs_form.save(function (err, inputs_form){
//     if(err) return console.error(err);
//     mongoose.deleteModel('Form_data');  
//     console.log('save');
// });

form_list.find(function (err, form_list) {
    if (err) return handleError(err);
    // console.log(form_list);
});

// ======================================= SCHEMA ================================================= //
var dataSchema = new mongoose.Schema({
    form_id: String,
    Customer: String,
    Transaction: String,
    data: Array 
});

ipcMain.on('upload-json', (event, arg, app_id) => {
    // console.log(arg) // prints "ping"
    // console.log(config);
    // console.log(app_id);
    const config = require(file + arg);

    var data = mongoose.model('Data', dataSchema);

    data.find({'Transaction': app_id}, function (err, data) {
        if (err) return handleError(err);
        // event.sender.send(data);
        event.sender.send('upload-json', config, data);
    });
    // console.log(send_data);
    // console.log(config);
    // console.log(config);
    // console.log(config._app.caption);
    
});

ipcMain.on('send_data', (event, arg) => {
    // console.log(arg.data);
    function makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    
        for (var i = 0; i < 25; i++){
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    var data = mongoose.model('Data', dataSchema);

    var inputs = new data({
        form_id: makeid(), Customer: arg.Customer, Transaction: arg.Transaction, data: arg.data
    });

    inputs.save(function (err, inputs){
        if(err) return console.error(err);
        mongoose.deleteModel('Data');  
        console.log('save');
    });
    // console.log(arg);
    // event.sender.send('upload-json', config)
});

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