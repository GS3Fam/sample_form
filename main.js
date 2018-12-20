const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const file = './form_data/';
const mongoose = require('mongoose');

var db = mongoose.connection;
var connection;
var db_online = 'mongodb://jairo_form:mngvPS5PqDNw4PW@ds139198.mlab.com:39198/db_test2';
mongoose.connect(db_online);
db.on('error', console.error.bind(console, 'connection error:'));

const{app, BrowserWindow, Menu, ipcMain} = electron;

// know if it is the start of app
var initial_start = true;

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
var dataSchema = new mongoose.Schema({}, {strict: false});
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
    if(con == connection){
        // console.log('same');
    }
    else{
        // console.log('not same');
        connection = con;
        json_files = [];
        if(connection == true){
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

                    // ======================== DISPLAY FIRST DATA ON FIRST LOAD ===================== //
                    if(initial_start){
                        try{
                            var form = mongoose.model('Form_data', formSchema);
                            form.find({'appId' : json_files[0].app_id}, function (err, config){
                                if (err) return handleError(err);
                
                                var data = mongoose.model(json_files[0].app_id, dataSchema);
                
                                data.find({'data._isDeleted': false}, function (err, data) {
                                    if (err) return handleError(err);
                                    var _id = [];
                                    data.forEach(element => {
                                        _id.push(element._id.toString());
                                    });
                                    event.sender.send('view-data', config[0]._doc, data, _id);
                                    // data = yung mga na save na data
                                    //config[0]._doc = yung mga form_data
                                });
                            });
                        }
                        catch(error){
                            console.log(error);
                        }
                        initial_start = false;
                    }
                });
            }
            catch(error){
                console.log(error);
            }
        }
        else if(connection == false){
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
                    // console.log(json_files);
                    event.sender.send('list_files', json_files)
                    // ============================ DISPLAY ON INITIAL START OFFLINE ====================== //
                    if(initial_start){
                        const config = require(file + json_files[0].path_send);
                        var data_local_path = ''
                        data_local_path = __dirname + '/data/' + json_files[0].app_id + '.json';
                        var data = [];

                        if (fs.existsSync(data_local_path)) {
                            fs.readFile(data_local_path, (err, local_data) => {
                                if (err) throw err;
                                let read_local_data = JSON.parse(local_data);
                                // console.log(read_local_data); 

                                data_local_new = read_local_data;

                                //container for the data of data_local
                                var _id = [];
                                data_local_data_new = read_local_data.data;

                                // store the id
                                data_local_new.data.forEach(one_data_1 => {
                                    _id.push(one_data_1._id);
                                });

                                // store the data
                                data_local_new.data.forEach(one_data_2 => {
                                    if(one_data_2._isDeleted){
                                        var data_local_save = {
                                            Customer : 'Customer A',
                                            Transaction: read_local_data.Transaction,
                                            data : one_data_2
                                        };
                                        // store the id
                                        _id.push(one_data_2._id);
                                        // console.log(data_local_new);
                                        data.push(data_local_save);
                                    }
                                });
                                event.sender.send('view-data', config, data, _id);
                            })
                            // container for data_local
                            // var data_local = require(data_local_path);
                        }
                        else{
                            _id = '';
                            event.sender.send('view-data', config, data, _id);
                            console.log('does not exist');
                        }
                        initial_start = false;
                    }
                    // ====================== END OF DISPLAY INITIAL START ====================== //
                });
            }
            catch(error){
                console.log(error);
            }
        }
    }

    // connection = con;
});

// ========================================== DISPLAY FORM ============================================== //
ipcMain.on('view-data', (event, arg, app_id) => {
    // console.log(arg);
    // console.log(app_id);
    // console.log(connection);
    if(connection){
        try{
            var form = mongoose.model('Form_data', formSchema);
            form.find({'appId' : app_id}, function (err, config){
                if (err) return handleError(err);

                var data = mongoose.model(app_id, dataSchema);

                data.find({'data._isDeleted': false}, function (err, data) {
                    if (err) return handleError(err);
                    var _id = [];
                    data.forEach(element => {
                        _id.push(element._id.toString());
                    });
                    event.sender.send('view-data', config[0]._doc, data, _id);
                    // data = yung mga na save na data
                    //config[0]._doc = yung mga form_data
                });
            });
        }
        catch(error){
            console.log(error);
        }
    }
    else if(connection == false){
        try{
            const config = require(file + arg);
            if(connection){
                var data = mongoose.model('Data', dataSchema);

                data.find({'Transaction': app_id}, function (err, data) {
                    if (err) return handleError(err);
                    event.sender.send('view-data', config, data);
                });
            }
            else{
                // console.log(config._app.appId);
                var data_local_path = ''
                data_local_path = __dirname + '/data/' + config._app.appId + '.json';
                var data = [];

                if (fs.existsSync(data_local_path)) {
                    fs.readFile(data_local_path, (err, local_data) => {
                        if (err) throw err;
                        let read_local_data = JSON.parse(local_data);
                        // console.log(read_local_data); 

                        data_local_new = read_local_data;

                        // console.log(data_local_new);
                        //container for the data of data_local
                        var _id = [];
                        data_local_data_new = read_local_data.data;

                        // store the data
                        data_local_new.data.forEach(one_data_2 => {
                            if(one_data_2._isDeleted){
                                var data_local_save = {
                                    Customer : 'Customer A',
                                    Transaction: read_local_data.Transaction,
                                    data : one_data_2
                                };
                                // store the id
                                _id.push(one_data_2._id);
                                // console.log(data_local_new);
                                data.push(data_local_save);
                            }
                        });

                        // console.log(data);
                        // console.log(_id);  
                        // data_local.data.forEach(element => {
                        //     data_local_new.data = element;
                        //     // console.log(data_local_new);
                        //     data.push(data_local_new);
                        // });
                        // console.log(data);
                        event.sender.send('view-data', config, data, _id);
                    })
                    // container for data_local
                    // var data_local = require(data_local_path);
                }
                else{
                    _id = '';
                    event.sender.send('view-data', config, data, _id);
                    console.log('does not exist');
                }
            }
        }
        catch(err){
            console.log(err);
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
    arg.data._updated = Date();
    arg.data._isDeleted = false;
    if(connection){
        var data = mongoose.model(arg.Transaction, dataSchema);
        var inputs = new data({
            Customer: arg.Customer, Transaction: arg.Transaction, data: arg.data
        });
        console.log(makeid());
        inputs.save(function (err, inputs){
            if(err) return console.error(err);
            console.log('save');
            // arg._id = inputs._id;
            // save 
            arg.data._id = inputs.id;
            var obj;
            var file_path = __dirname + '/data/'+arg.Transaction+'.json';

            try{
                if (fs.existsSync(file_path)) {
                    fs.readFile(file_path, 'utf8', function (err, data) {
                        if (err) throw err;
                        obj = JSON.parse(data);
                        if(Array.isArray(obj.data)){
                            //true
                            obj.data.push(arg.data);
                            fs.writeFile(file_path, JSON.stringify(obj, null, 2), function (err){
                                if (err) throw err;
                                console.log('saved locally');
                            });
                        }
                        else{
                            //is not an array
                            var making_array = [obj.data];
                            making_array.push(arg.data);
                            obj.data = making_array;
                            fs.writeFile(file_path, JSON.stringify(obj, null, 2), function (err){
                                if (err) throw err;
                                console.log('saved locally');
                            });
                        }
                        // var array = arg.data;
                        // console.log(array);
                        // console.log(array);
                        // console.log(obj.data)
                    });
                }
                else{
                    console.log('does not exist');

                    var making_array = [arg.data];
                    // making_array.push(arg.data);
                    arg.data = making_array;
                    // console.log(arg)
                    fs.appendFile(file_path, JSON.stringify(arg, null, 2), function (err){
                        if (err) throw err;
                        console.log('saved locally');
                    });
                }
            }
            catch(err){
                console.log(err)
            }

            // data.findOneAndUpdate({_id : new_id}, new_id, {upsert:true}, function (err, inputs_find) {
            //     if (err) return handleError(err);
            //     console.log('updated');
            //     // console.log(inputs);

            //     // inputs_find.id = new_id;
                
            //     // inputs_find.save(function (err, inputs) {
            //     //     if (err) return handleError(err);
            //     //     console.log('updated')
            //     // });
            //     // console.log(inputs);
            //     // inputs.id = _id;
            //     // inputs.save(function (err, inputs) {
            //     //     if (err) return handleError(err);
            //     //     console.log('updated')
            //     // });
            //     // mongoose.deleteModel(arg.Transaction);
            // });
        });


        // var file_name = makeid();
        // fs.writeFile('data/'+file_name+'.json', JSON.stringify(arg), function (err){
        //     if (err) throw err;
        //     console.log('saved locally');
        // });

        event.sender.send('saved-indicator', true);
    }
    else{
        // console.log(JSON.stringify(arg));

        // write every json
        // var file_name = makeid();
        // fs.writeFile('data/'+file_name+'.json', JSON.stringify(arg), function (err){
        //     if (err) throw err;

        //     console.log('saved locally');
        // })
        // fs.appendFile('data/'+arg.Transaction+'.json', JSON.stringify(arg, null, 2), function (err){
        //     if (err) throw err;

        //     console.log('saved locally');
        // })
        // event.sender.send('saved-indicator', true);
        arg.data._id = makeid();
        var obj;
        var file_path = __dirname + '/data/'+arg.Transaction+'.json';

        try{
            if (fs.existsSync(file_path)) {
                fs.readFile(file_path, 'utf8', function (err, data) {
                    if (err) throw err;
                    obj = JSON.parse(data);
                    if(Array.isArray(obj.data)){
                        //true
                        obj.data.push(arg.data);
                        fs.writeFile(file_path, JSON.stringify(obj, null, 2), function (err){
                            if (err) throw err;
                            console.log('saved locally');
                        });
                    }
                    else{
                        //is not an array
                        var making_array = [obj.data];
                        making_array.push(arg.data);
                        obj.data = making_array;
                        fs.writeFile(file_path, JSON.stringify(obj, null, 2), function (err){
                            if (err) throw err;
                            console.log('saved locally');
                        });
                    }
                    // var array = arg.data;
                    // console.log(array);
                    // console.log(array);
                    // console.log(obj.data)
                });
            }
            else{
                console.log('does not exist');

                var making_array = [arg.data];
                // making_array.push(arg.data);
                arg.data = making_array;
                // console.log(arg)
                fs.appendFile(file_path, JSON.stringify(arg, null, 2), function (err){
                    if (err) throw err;
                    console.log('saved locally');
                });
            }
        }
        catch(err){
            console.log(err)
        }
        event.sender.send('saved-indicator', true);
    }
});

// ============================= DELETE DATA ============================ //
ipcMain.on('view-delete-data', (event, data_id, app_id) => {
    if(connection){
        var data = mongoose.model(app_id, dataSchema);
        data.findById(data_id, function (err, data){
            if(err) console.log(err);
            event.sender.send('view-delete-data', data_id, data);
        });
    }
    else{
        // =============================== VIEW DELETE LOCALLY ======================== //
        var obj;
        var file_path = __dirname + '/data/'+app_id+'.json';

        try{
            if (fs.existsSync(file_path)) {
                fs.readFile(file_path, 'utf8', function (err, data) {
                    obj = JSON.parse(data);
                    var obj_format = {};
                    obj.data.forEach(element => {
                        if(element._id === data_id){
                            var index = obj.data.indexOf(element);
                            obj.data.splice(index, 0);
                            obj_format = {
                                _id: element._id,
                                Customer: 'Customer A',
                                Transaction: app_id,
                                data: obj.data.splice(index, 1)[0]
                            }
                        }
                    });
                    delete obj_format.data['_id'];
                    event.sender.send('view-delete-data', data_id, obj_format);
                });
            }
            else{
                console.log('does not exist');
            }
        }
        catch(err){
            console.log(err)
        }
        // console.log('No connection');

    }
})

ipcMain.on('delete-data', (event, data_id, app_id) => {
    if(connection){
        var data = mongoose.model(app_id, dataSchema);
        data.update({_id: data_id}, { $set: {'data._isDeleted': true}}, function (err, data){
            if (err) console.log(err);
            console.log('deleted');
            event.sender.send('delete-indicator', true);
        });
        // hard delete
        // data.findByIdAndRemove(data_id, function (err, data){
        //     if(err) console.log(err);
        //     console.log('deleted');
        //     // event.sender.send('view-delete-data', data_id, data);
        //     event.sender.send('delete-indicator', true);
        // });

        // ================================== DELETE LOCALLY ====================================//
        var obj;
        var file_path = __dirname + '/data/'+app_id+'.json';

        try{
            if (fs.existsSync(file_path)) {
                fs.readFile(file_path, 'utf8', function (err, data) {
                    obj = JSON.parse(data);
                    obj.data.forEach(element => {
                        if(element._id === data_id){
                            var index = obj.data.indexOf(element);
                            obj.data[index]._isDeleted = true;
                        }
                    });
                    // console.log(obj);

                    fs.writeFile(file_path, JSON.stringify(obj, null, 2), function (err){
                        if (err) throw err;
                        console.log('deleted locally');
                    });
                });
            }
            else{
                console.log('does not exist');

                var making_array = [arg.data];
                // making_array.push(arg.data);
                arg.data = making_array;
                // console.log(arg)
                fs.appendFile(file_path, JSON.stringify(arg, null, 2), function (err){
                    if (err) throw err;
                    console.log('saved locally');
                });
            }
        }
        catch(err){
            console.log(err)
        }
        // ================================ END DELETE LOCALLY ==================================//

    }
    else{
        // ================================ DELETE OFFLINE =====================================//
        console.log('No connection');
        try{
            var obj;
            var file_path = __dirname + '/data/'+app_id+'.json';

            if (fs.existsSync(file_path)) {
                fs.readFile(file_path, 'utf8', function (err, data) {
                    obj = JSON.parse(data);
                    obj.data.forEach(element => {
                        if(element._id === data_id){
                            var index = obj.data.indexOf(element);
                            // obj.data.splice(index, 1)
                            obj.data[index]._isDeleted = true;
                        }
                    });
                    // console.log(obj);

                    fs.writeFile(file_path, JSON.stringify(obj, null, 2), function (err){
                        if (err) throw err;
                        console.log('deleted locally');
                    });
                });
                event.sender.send('delete-indicator', true);
            }
            else{
                console.log('does not exist');

                var making_array = [arg.data];
                // making_array.push(arg.data);
                arg.data = making_array;
                // console.log(arg)
                fs.appendFile(file_path, JSON.stringify(arg, null, 2), function (err){
                    if (err) throw err;
                    console.log('saved locally');
                });
            }
        }
        catch(err){
            console.log(err)
        }
        // ============================== END DELETE OFFLINE ===================================//
    }
});

ipcMain.on('view-edit-data', (event, data_id, app_id) => {
    console.log(data_id);
    console.log(app_id);
});
// =============== offline ========================== //

// ipcMain.on('upload-json', (event, arg, app_id) => {
//     // console.log(arg) // prints "ping"
    
// });

// ============================================ FUNCTION WINDOWS ======================================== //

const mainMenuTemplate = [
    {
        label: 'File',
        submenu:[
            {
                label: 'Select File'

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