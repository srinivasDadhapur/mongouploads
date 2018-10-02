const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

app.set('view engine','ejs');
app.use(bodyParser.json());
app.use(methodOverride('_method'));

const mongoURI = 'mongodb://127.0.0.1:27017/mongouploads';
const conn = mongoose.createConnection(mongoURI);
conn.on('connected',()=>{
    console.log('Connected')
})
conn.on('error',()=>{
    console.log('Error Connecting');
})


let gfs;
conn.once('open',()=>{
    gfs = Grid(conn.db,mongoose.mongo);
    gfs.collection('uploads');
});


const storage = new GridFsStorage({
    url:mongoURI,
    file:(req,file)=>{
        return new Promise((resolve,reject)=>{
            crypto.randomBytes(16,(err,buf)=>{
                if(err){
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileinfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileinfo);
            });
        });
    }
});

const upload = multer({storage});


app.post('/upload',upload.single('file'),(req,res)=>{
    // res.json({file:req.file});
    res.redirect('/');
});


app.get('/files',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length==0){
            res.status(404).json({err:'No files exists'});
        }
        return res.json(files);
    });
});


app.get('/files/:filename',(req,res)=>{
    gfs.files.findOne({filename:req.params.filename}, (err,file)=>{
        if(!file || file.length==0){
            res.status(404).json({err:'No files exists'});
        }
        return res.json(file);
    });
});




app.get('/images/:filename',(req,res)=>{
    gfs.files.findOne({filename:req.params.filename}, (err,file)=>{
        if(!file || file.length==0){
            return res.status(404).json({err:'No files exists'});
        }
        // return res.json(files);
        if(file.contentType === 'image/jpeg' || file.contentType === 'img/png'){
            const readStream = gfs.createReadStream(file.filename);
            readStream.pipe(res);
        }else{
            res.status(404).json({error:'not an image file'});     
        }
    });
});



app.get('/',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length==0){
            res.render('index',{files:false});
        }
        else{
            files.map(file=>{
                if(file.contentType === 'image/jpeg' || file.contentType === 'image/png'){
                    file.isImage = true;
                }else{
                    file.isImage = false;
                }
            });
            res.render('index',{files:files});
        }
    });
});


app.delete('/files/:id',(req,res)=>{
    console.log('Something is wrong');
    gfs.remove({_id:req.params.id, root:'uploads'},(err,GridFSBucket)=>{
        if(err){
            return res.status(404).json({err:err});
        }
        res.redirect('/');
    });
});

app.listen(8080,()=>console.log('Server listening on 8080'));