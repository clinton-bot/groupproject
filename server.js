const express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
const app = express();
var loginSession = require('cookie-session');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

var router = express.Router();
const http = require('http');
const url = require('url');

const mongoose = require('mongoose');
const mongourl = '';
const dbName = 'test';

// const formidable = require('express-formidable');
// app.use(formidable());
// const fs = require('fs');

var Owner = '';
var currentDoc = '';
var avgRate;
var duplicated = false;
var map_lat;
var map_lon;


app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.use(loginSession({
    name: 'session',
    keys: ['views', 'key2']
}));

var userSchema = require('./models/user');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))


const createRestaurant = (db, criteria, res, callback) => {
    duplicated = false;
    db.collection('Restaurant').
    insertOne({    
        "_id" : criteria._id,
        "name" : criteria.name,
        "borough" : criteria.borough,
        "cuisine" : criteria.cuisine,
        "street" : criteria.street,
        "building" : criteria.building,
        "zipcode" : criteria.zipcode,
        "rated" : [],
        "rating" : [],
        //"photo" : '',
        "lon" : criteria.lon,
        "lat" : criteria.lat,
        "owner" : Owner
    },  (err, docs) => {
            assert.equal(err,null);
            console.log("inserted one document ");
            callback(docs);
        });
}

const findRestaurants = (db, criteria, callback) => { 

    var cursor = db.collection('Restaurant').find(criteria);

    cursor.toArray((err,docs) => {
        
        assert.equal(err,null);
        callback(docs);
    });
}

//read Restaurant details
const showRestaurants = (db, criteria, callback) => { 
    
    var ObjectID = require('mongodb').ObjectID;

    if (criteria != null) {
        var cursor = db.collection('Restaurant').find(ObjectID(criteria._id));
 
    }
    else {
        var cursor = db.collection('Restaurant').find();
    }

    cursor.toArray((err,docs) => {
        for(var r of docs){
            map_lon = r.lon;
            map_lat = r.lat;
        }
        assert.equal(err,null);
        callback(docs);
    })
};

const updateRestaurants =(db, criteria,res,callback) => {

    var ObjectID = require('mongodb').ObjectID;   

    var updateDoc={ "_id": ObjectID(criteria.id)};

    db.collection('Restaurant').updateOne(updateDoc,
        {
            $set: {
                "name": criteria.name,
                "borough": criteria.borough,
                "cuisine": criteria.cuisine,
                "street": criteria.street,
                "building": criteria.building,
                "zipcode" : criteria.zipcode,
                //"photo" : '',
                "lon" : criteria.lon,
                "lat" : criteria.lat
            }
        },(err, results) => {
            assert.equal(err, null);
            console.log("update successfully");
            
            callback(results);
        }
    );
}
const refreshedRate = () => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        const db = client.db(dbName)

        var ObjectID = require('mongodb').ObjectID;
        var DOCID = {};
        DOCID['_id'] = ObjectID(currentDoc);

        var cursor = db.collection('Restaurant').find(DOCID);        
        cursor.toArray((err,docs) => {
            console.log('refreshed')
            var sum = 0;
            for(var r of docs){
                for(var i = 0; i < r.rating.length;i++){
                    sum += parseInt(r.rating[i], 10) || 0;
                }
                console.log(sum)
                console.log(avgRate)
                avgRate = sum / r.rating.length;
                console.log(avgRate)
            }
        })
    })
}

const checkRating = (db, criteria, callback) => {
    var ObjectID = require('mongodb').ObjectID;
    var DOCID = {};
    DOCID['_id'] = ObjectID(currentDoc);
    var updateDoc = {};
    updateDoc['rated'] = Owner;
    var cursor = db.collection('Restaurant').find(DOCID);
    cursor.toArray((err,docs) => {
        for(var r of docs){
            for(var i = 0; i < r.rated.length;i++){
                if(r.rated[i] == Owner){
                    duplicated = true;
                    
                }else{
                    duplicated = false;
                    }
            }
        }
        callback();
    })
    
}

const updateRating = (db, criteria, callback) => {
    var ObjectID = require('mongodb').ObjectID;
    var DOCID = {};
    DOCID['_id'] = ObjectID(currentDoc);
    var updateDoc = {};
    updateDoc['rating'] = criteria.rating;
    updateDoc['rated'] = Owner;
    var cursor = db.collection('Restaurant').find(DOCID);
    cursor.toArray((err,docs) => {
        for(var r of docs){
            
            for(var i = 0; i < r.rated.length;i++){
                if(r.rated[i] == Owner){
                    duplicated = true;
                }
            }
            if(!duplicated){
                db.collection('Restaurant').updateOne(DOCID, {$push : updateDoc}, (err, results) => {
                    assert.equal(err, null);
                    console.log("update successfully");
                    refreshedRate();
                    updated = true;
                    callback(results);
                });
            }else{
                console.log(duplicated)
            }
        }
    })
}

const deleteRestaurants =(db, criteria,res,callback) => {

    var ObjectID = require('mongodb').ObjectID;   

    var deleteDoc={ "_id": ObjectID(criteria._id)};

    db.collection('Restaurant').deleteOne(deleteDoc,(err, results) => {
            assert.equal(err, null);
            console.log("delete successfully");
         
            callback(results);
        }
    );
}

const handle_find = (res, criteria) => {

    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("handle_find connected successfully to server");
        const db = client.db(dbName);
        
        findRestaurants(db, criteria, (docs) => {
            client.close();
            res.status(200).json(docs);
        });
    });
}


const handle_read = (res, criteria) => {
    currentDoc = criteria._id;
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        try {
            assert.equal(null, err);
        }catch{
            res.writeHead(500, {'Content-Type':'text/html'});
            res.write(`<p>Unable to connect to MongoDB (${mongourl})`);
            res.write(`<p>${JSON.stringify(err)}</p>`)
            res.end('</body></html>');
            return(-1);
        }

        console.log("handle_read Connected successfully to server");
        const db = client.db(dbName);
        showRestaurants(db, criteria, (docs) => {
            client.close();
            
            res.status(200).render('read', {docs: docs, userName: Owner, rating: avgRate, rate: docs.rated})

          });
    });
}

const handle_display = (res, req, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        try {
            assert.equal(null, err);
        }catch{
            res.writeHead(500, {'Content-Type':'text/html'});
            res.write(`<p>Unable to connect to MongoDB (${mongourl})`);
            res.write(`<p>${JSON.stringify(err)}</p>`)
            res.end('</body></html>');
            return(-1);
        }

    console.log("handle_display connected successfully to server");
    
    const db = client.db(dbName);

    showRestaurants(db,criteria, (docs) => {
        client.close();
        const db = client.db(dbName);
        res.status(200).render('display',{docs: docs, ejsUser: Owner});
        })
    })
}

const handle_showMap = (res, criteria) => {
    currentDoc = criteria._id;

    const client = new MongoClient(mongourl);
    client.connect((err) => {
        try {
            assert.equal(null, err);
        }catch{
            res.writeHead(500, {'Content-Type':'text/html'});
            res.write(`<p>Unable to connect to MongoDB (${mongourl})`);
            res.write(`<p>${JSON.stringify(err)}</p>`)
            res.end('</body></html>');
            return(-1);
        }

        console.log("handle_showMap connected successfully to server");
        const db = client.db(dbName);
        showRestaurants(db, criteria, (docs) => {
            client.close();
            res.status(200).render('map' ,{
                lat:map_lat,
                lon:map_lon,
                zoom:docs.zoom ? docs.zoom : 15
            })
          });
    });
}

const handle_updateRating = (res, criteria) => {
    const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("handle_updateRating connected")
            const db = client.db(dbName)

            updateRating(db, criteria, (docs) => {
                client.close();
                updated = true;
                console.log("rated");
                res.status(200).render('rated');
            })
        })
}


// const updateDocument = (criteria, updateDoc, callback) => {
//     const client = new MongoClient(mongourl);
//     client.connect((err) => {
//         assert.equal(null, err);
//         console.log("Connected successfully to server");
//         const db = client.db(dbName);

//          db.collection('Restaurant').updateOne(criteria,
//             {
//                 $set : updateDoc
//             },
//             (err, results) => {
//                 client.close();
//                 assert.equal(err, null);
//                 callback(results);
//             }
//         );
//     });
// }

// const handle_UploadPhoto = (req, res, criteria) => {

//     var DOCID = {};
//     DOCID['_id'] = ObjectID(DOCID1._id);
//     var updateDoc = {};

//     if (req.files.filetoupload.size > 0) {
//         fs.readFile(req.files.filetoupload.path, (err,data) => {
//             assert.equal(err,null);
//             updateDoc['photo'] = new Buffer.from(data).toString('base64');
//             updateDocument(DOCID, updateDoc, (results) => {
//                 res.status(200).render('info', {message: `Updated ${results.result.nModified} document(s)`})

//             });
//         });
//     } else {
//         updateDocument(DOCID, updateDoc, (results) => {
//             res.status(200).render('info', {message: `Updated ${results.result.nModified} document(s)`})

//         });
//     }
// }

const handle_checkRating = (res, criteria) => {
    const client = new MongoClient(mongourl);
        client.connect((err) => {
            assert.equal(null, err);
            console.log("handle_checkRating Server connected")
            const db = client.db(dbName)

            checkRating(db, criteria, () => {
                client.close();
                if(duplicated){  
                res.status(200).render('rated')
                }else{
                res.status(200).render('rate')
                }
            })
        })
}

const handle_createDoc = (res, criteria) => {
    if (JSON.stringify(criteria) !== '{}' && criteria.name != "") {
        const client = new MongoClient(mongourl);
        client.connect((err) => {
        try {
            assert.equal(null, err);
        }catch{
            res.writeHead(500, {'Content-Type':'text/html'});
            res.write(`<p>Unable to connect to MongoDB (${mongourl})`);
            res.write(`<p>${JSON.stringify(err)}</p>`)
            res.end('</body></html>');
            return(-1);
        }

        console.log("handle_createDoc Connected successfully");
        const db = client.db(dbName);
        createRestaurant(db, criteria, res, (results) => {
            client.close();

            if (results.insertedCount == 1) {
                res.status(200).render('created',{c: criteria,owner_name : Owner});    
       
            } else {
                res.writeHead(500, {'Content-Type':'text/html'});
                res.write('<p>Error in creating Restaurant!</p>');
                res.end('</body></html>');
            }
        })
    });
    }else if(criteria.name == ""){
        res.status(200).render('C_Doc_error'); 
        res.redirect('/createDoc')
    }else{
        res.status(200).render('create', {owner_name : Owner});  
    }
}

const handle_Update = (res, criteria) => {
    

    if (JSON.stringify(criteria) !== '{}' && criteria.name != "") {
        console.log('update processing');
        const client = new MongoClient(mongourl);
        client.connect((err) => {
        try {
            assert.equal(null, err);
        }catch{
            res.writeHead(500, {'Content-Type':'text/html'});
            res.write(`<p>Unable to connect to MongoDB (${mongourl})`);
            res.write(`<p>${JSON.stringify(err)}</p>`)
            res.end('</body></html>');
            return(-1);
        }

        console.log("handle_Update Connected successfully");
        const db = client.db(dbName);

        updateRestaurants(db, criteria, res, (results) => {
            client.close();
            if (results.modifiedCount == 1) {
                res.status(200).render('updated');
            } else {
                res.writeHead(500, {'Content-Type':'text/html'});
                res.write('<p> update error </p>');
                res.end('</body></html>');
            }
        })
    });
    
    }else if(criteria.name == ""){
        res.status(200).render('U_Doc_error'); 
        res.redirect('/home')
    }else{
        res.status(200).render('update', {owner_name : Owner});  
    }
}

const handle_delete = (res, criteria) => {

    if (JSON.stringify(criteria) !== '{}') {
        console.log('DELETE processing');
        const client = new MongoClient(mongourl);
        client.connect((err) => {
        try {
            assert.equal(null, err);
        }catch{
            res.writeHead(500, {'Content-Type':'text/html'});
            res.write(`<p>Unable to connect to MongoDB (${mongourl})`);
            res.write(`<p>${JSON.stringify(err)}</p>`)
            res.end('</body></html>');
            return(-1);
        }

        console.log("handle_delete Connected successfully to server");
        const db = client.db(dbName);
        deleteRestaurants(db, criteria, res, (results) => {
            client.close();
            
            if (results.deletedCount == 1) {
                res.status(200).render('deleted');
            } else {
                res.writeHead(500, {'Content-Type':'text/html'});
                res.write('<p> delete error </p>');
                res.end('</body></html>');
            }
        })
    });
    
    }
    else{
        console.log('delete error');
        res.status(200).render('delete', {owner_name : Owner});  
    }
}

// get and post and api
app.get('/', function(req, res){
    res.render('login')
})

app.get('/signup', function(req, res){
    res.status(200).render('signUp')
})

app.get('/login', function(req, res){
    res.status(200).render('login')
})


app.get('/logout', function(req, res){
    req.session.authenticated = null;
    req.session.username = null;
    Owner = null;
    res.redirect('/')
})

app.use(upload.array());
app.use(express.static('public'));

app.post('/create', function(req, res){
    if(req.body.password == req.body.password2){
    mongoose.connect(mongourl, { useNewUrlParser: true });
    var db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:')); 
        db.once('open', function (callback) {
            var userNew = mongoose.model('user', userSchema);
            var user = new userNew({
                userName: req.body.id,
                password: req.body.password
            });
            
            user.validate((err) => {
                console.log(err)
            })

            user.save((err) => {
                if (err) return res.status(400).json({ message: 'Create unsucessful! User already exist!'})
                res.redirect('/')
                db.close();
            });
        });  
    }else{
        res.status(400).json({message: 'User cannot create, password is not the same'})
    }
});

app.post('/login', function(req, res){

    const client = new MongoClient(mongourl);

        client.connect((err) => {
            assert.equal(null, err);
            console.log("Server connected")
  
            const db = client.db(dbName)

            db.collection('users').findOne({userName: req.body.id}, function(err, users) {
                if (users && users.password === req.body.password){
                    console.log('User and password is correct')
                    Owner = req.body.id;
                    req.session.username = req.body.id;
                    req.session.authenticated = true;
                    console.log("login connected");

                    res.redirect('/home');

                }else if(!users){
                    let errormsg = "User does not exist.";
                    res.status(500).json({errormsg});
                }else {
                    let errormsg = "Wrong Password";
                    res.status(500).json({errormsg});
                }
                if(err) {
                    res.status(500).send(err).end()
                }
         });
    })
})

app.get('/home', (req,res) => {
    handle_display(res, req.query.docs);
})

app.get('/show', (req,res) => {
    handle_read(res, req.query);
})

app.get('/createDoc', (req,res) => {
    handle_createDoc(res, req.query);
})

app.post('/createDoc', (req,res) => {
    handle_createDoc(res, req.query);
})

app.get('/find', (req,res) =>{
    handle_find(res, req.query);
})

app.get('/update',(req,res) => {
    res.render('update', req.query);
  })

app.post('/update',(req,res) => {
   handle_Update(res,req.body);
}) 

app.get('/delete',(req,res) => {
    handle_delete(res,req.query);
})

app.post('/delete',(req,res) => {
    handle_delete(res,req.body);
}) 

app.get('/rating', function(req, res){
    handle_checkRating(res, req.body)
});

app.post('/rating', function(req, res){
    handle_updateRating(res, req.body)
});

app.get('/map', (req,res) => {
    handle_showMap(res, req.query)
});

// app.post('/upload', (req,res) => {
//     handle_UploadPhoto(req, res, req.query);
// })

//api
app.get('/api/Restaurant/:type/:name', (req,res) => {
    if (req.params.type == 'name'  && req.params.name != {}) {
        var criteria = {};
        criteria['name'] = req.params.name;
        handle_find(res, criteria);

    } else if (req.params.type == 'borough' && req.params.name != {}){
        var criteria = {};
        criteria['borough'] = req.params.name;
        const client = new MongoClient(mongourl);
        handle_find(res, criteria);
    } else if (req.params.type == 'cuisine' && req.params.name != {}){
        var criteria = {};
        criteria['cuisine'] = req.params.name;
        const client = new MongoClient(mongourl);
        handle_find(res, criteria);
    }else {
        res.status(500).json({"error": "Unknown request"});
    }
})

app.get('/*', (req,res) => {
    res.status(404).send(`${req.path} - Unknown request!`);
})

app.listen(app.listen(process.env.PORT || 8099));
