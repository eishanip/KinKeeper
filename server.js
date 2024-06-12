require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require('multer')
const GridFsStorage = require('multer-gridfs-storage').GridFsStorage
const Grid = require('gridfs-stream')
const { GridFSBucket } = require("mongodb");
const cors = require('cors')
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json())
app.use(cors())
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600 * 1000, sameSite: 'none', secure: false },
    rolling: true
}))
function checkSession(req, res, next) {
    if (req.session.user) next()
    else res.send("Unauthorized,log in.")
}
mongoose.connect(process.env.URI).then(() => {
    console.log("Connected to the database.")
});
const connection = mongoose.connection;
let gfs;
connection.once('open', () => {
    gfs = Grid(connection.db, mongoose.mongo);
    gfs.collection('uploads');
});
const userSchema = new mongoose.Schema({
    fName: String,
    lName: String,
    email: String,
    phone: String,
    gender: String,
    dob: Date,
    userid: String,
    password: String,
});
const taskSchema = new mongoose.Schema({
    task: String,
    deadline: Date,
    description: String,
    priority: Number,
    uid: String
})
const expenseSchema = new mongoose.Schema({
    expense: String,
    amount: Number,
    uid: String
})
const scheduleSchema = new mongoose.Schema({
    date: Number,
    name: String,
    time: String,
    location: String,
    description: String,
    month: String,
    day: String,
    uid: String
})
const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const Expense = mongoose.model('Expense', expenseSchema)
const Schedule = mongoose.model('Schedule', scheduleSchema)
app.post("/register", async (req, res) => {
    let ifExists = await User.findOne({ userid: req.body.userid })
    if (ifExists)
        res.status(401).json("This userid already exists.")
    else {
        let newUser = new User({
            fName: req.body.fName,
            lName: req.body.lName,
            email: req.body.email,
            phone: req.body.phone,
            gender: req.body.gender,
            dob: req.body.dob,
            userid: req.body.userid,
            password: req.body.password
        })
        await newUser.save();
        req.session.user = newUser;
        res.status(200).send('Alright')
    }
});
app.get("/login", (req, res) => {
    res.redirect('http://localhost:63342/webProject/pages/login_3.html?_ijt=uj8p9atv0skc0nnfvrao5keq94 & _ij_reload=RELOAD_ON_SAVE')
})
app.post("/login", async (req, res) => {
    let ifExists = await User.findOne({
        userid: req.body.userid, password:
            req.body.password
    })
    if (ifExists) {
        req.session.user = ifExists;
        res.status(200).send('Ok')
    } else
        res.status(401).send("Not correct.")
});
app.get('/logout', checkSession, async (req, res) => {
    await req.session.destroy(err => {
        if (err) {
            res.send("Logged out successfully.")
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('http://localhost:63342/webProject/pages/landing.html?_ijt = ikc33jggas9n7pqh7nt30lclsn & _ij_reload=RELOAD_ON_SAVE');
    });
});
app.get("/tasks", checkSession, async (req, res) => {
    let tasks = await Task.find({ uid: req.session.user._id });
    if (tasks.length === 0)
        res.send("You don't have any pending tasks at the moment.")
    else {
        res.send(tasks)
    }
})
app.post("/tasks", checkSession, async (req, res) => {
    let newTask = new Task({
        task: req.body.task,
        deadline: req.body.deadline,
        description: req.body.description,
        priority: req.body.priority,
        uid: req.session.user._id
    })
    await newTask.save();
    res.status(200).send("Alright")
})
app.delete('/tasks/:id', async (req, res) => {
    let task = await Task.findById(req.params.id);
    if (!task) res.status(404).send("No task found with this id.")
    else {
        await Task.findByIdAndDelete(req.params.id);
        res.status(200).send('Successful.')
    }
});
app.get("/expense", checkSession, async (req, res) => {
    let expenses = await Expense.find({ uid: req.session.user._id })
    if (expenses.length === 0) res.send("You have no expenses")
    else res.json(expenses)
})
app.post("/expense", checkSession, async (req, res) => {
    let newExpense = new Expense({
        expense: req.body.expense,
        amount: req.body.amount,
        uid: req.session.user._id
    })
    await newExpense.save()
    res.redirect('http://localhost:63342/webProject/pages/dashboard.html?_ijt=melpap39kj34fcg2kfehjc1quk & _ij_reload=RELOAD_ON_SAVE#!/expense_tracker')
})
app.delete("/expense/:id", checkSession, async (req, res) => {
    let expenseId = req.params.id;
    let expense = await Expense.findById(expenseId);
    if (!expense) res.status(404).send("No expense found with this id.")
    else {
        await Expense.findByIdAndDelete(expenseId);
        res.status(200).send('Successful.')
    }
})
app.get("/schedule", checkSession, async (req, res) => {
    let schedules = await Schedule.find({ uid: req.session.user._id });
    if (schedules.length === 0) res.send("You have an empty schedule.")
    else res.send(schedules)
})
function getMonthName(monthNumber) {
    const monthNames = ["January", "February", "March", "April", "May",
        "June", "July", "August", "September", "October", "November", "December"];
    return monthNames[monthNumber - 1];
}
app.post("/schedule", checkSession, async (req, res) => {
    let input = new Date(req.body.date)
    let date = input.getDate();
    let dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
        "Friday", "Saturday"];
    let day = dayNames[input.getDay()];
    let month = getMonthName(input.getMonth() + 1);
    let newSchedule = new Schedule({
        name: req.body.name,
        time: req.body.time,
        location: req.body.location,
        description: req.body.description,
        date: date,
        day: day,
        month: month,
        uid: req.session.user._id
    })
    await newSchedule.save()
    res.redirect('http://localhost:63342/webProject/pages/dashboard.html?_ijt=melpap39kj34fcg2kfehjc1quk & _ij_reload=RELOAD_ON_SAVE#!/scheduler')
})
function dynamicCategory(input) {
    return new GridFsStorage({
        url: process.env.URI,
        file: (req, file) => {
            return new Promise((resolve, reject) => {
                const filename = file.originalname;
                const fileInfo = {
                    filename: filename,
                    metadata: {
                        category: input,
                        uid: req.session.user._id
                    },
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        }
    });
}
function createAmenity(input) {
    app.get(`/${input}`
        , checkSession, async (req, res) => {
            let result = await mongoose.connection.db.collection('uploads.files')
                .find({
                    "metadata.category": `${input}`
                    , "metadata.uid":
                        req.session.user._id
                }).toArray();
            if (result.length === 0)
                res.send(`You have no files in ${input} folder.`)
            else res.send(result);
        })
    const storage = dynamicCategory(input)
    const upload = multer({ storage })
    app.post(`/${input}/upload`, checkSession, upload.single('file'), (req,
        res) => {
        if (!req.file)
            res.send("File not uploaded.")
        res.redirect('http://localhost:63342/webProject/pages/dashboard.html?_ijt = melpap39kj34fcg2kfehjc1quk & _ij_reload=RELOAD_ON_SAVE#!/doc_manage_1')
    })
    app.get(`/${input}/filenames`, checkSession, async (req, res) => {
        try {
            console.log(req.session.user._id)
            const files = await
                mongoose.connection.db.collection('uploads.files').find({
                    'metadata.category': `
${input}`
                    , 'metadata.uid': req.session.user._id
                }).toArray();
            const filenames = files.map(file => file.filename);
            res.json(filenames);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('Internal server error');
        }
    });
}
let amenities = ['electronics', 'home', 'payments', 'groceries'
    , 'maintenance', 'health', 'travel', 'legal'];
for (let amenity of amenities) createAmenity(amenity)
app.get('/download/:filename', async (req, res) => {
    try {
        const bucket = new GridFSBucket(mongoose.connection.db, {
            bucketName:
                'uploads'
        });
        const file = await
            mongoose.connection.db.collection('uploads.files').findOne({
                filename:
                    req.params.filename
            });
        if (!file) {
            res.status(404).json({ message: 'File not found' });
            return;
        }
        const downloadStream = bucket.openDownloadStream(new
            mongoose.Types.ObjectId(file._id));
        downloadStream.pipe(res);
        downloadStream.on('error', (error) => {
            console.error('Error downloading file:', error);
            res.status(500).send('Internal server error');
        });
        downloadStream.on('finish', () => {
            console.log('File downloaded successfully');
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal server error');
    }
});
app.listen(3000, () => {
    console.log("SERVER ON")
})