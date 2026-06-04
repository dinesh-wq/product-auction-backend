const {Pool} = require("pg")
const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const {v4: uuidv4} = require('uuid')

const app = express()

app.use(express.json())

const pool = new Pool({connectionString: 'postgres://019e8dd0-7535-786e-baaf-123851f830f3:cc878fd6-f81f-4b4e-8097-41a57ee17504@us-west-2.db.thenile.dev:5432/british_auction'})

let client = null

const initializeDbAndServer = async () => {
    try {
        client = await pool.connect();
        app.listen(3001, () => {
            console.log(`app started at localhost: 3001`)
        })
    }
    catch(error) {
        console.log(`DB Error : ${error.message}`)
        process.exit(1)
    }
}

initializeDbAndServer()

// API 1 GET (to get the list of all users)
app.get('/users', async (request, response) => {
    try {
        const dbResponse = await client.query(`SELECT * FROM users;`)
        const users = dbResponse.rows
        response.json(users)
    }
    catch(e) {
        console.log(`Failed to get the All users: ${e.message}`)
        process.exit(1)
    }
})

// API 2 GET (to get the specific user from the db)
app.get('/users/:userId', async (request, response) => {
    try {
        const {userId} = request.params
        const dbResponse = await client.query(`SELECT * FROM users WHERE user_id='${userId}';`)
        response.json(dbResponse.rows)
    }
    catch(e) {
        console.log(`Failed to get the user: ${e.message}`)
        process.exit(1)
    }
})

// API 3 (to Login the user)
app.post('/login', async (request, response) =>  {
    try {
        const {email, password} = request.body
        const dbResponse = await client.query(`SELECT *
                                             FROM users
                                             WHERE email = '${email}';`)
        const data = dbResponse.rows
        if (data.length === 0) {
            response.json({ok: false, message: 'Email Not Found'})
        }
        else {
            const originalHashedPassword = data[0].password_hash
            const user_id = data[0].user_id
            const isPasswordCorrect = await bcrypt.compare(password, originalHashedPassword)
            if (isPasswordCorrect) {
                const jwt_token = jwt.sign({user_id, email, password}, 'dinesh')
                response.json({ok: true, jwt_token})
            }
            else {
                response.json({ok: false, message: 'Invalid Password'})
            }
        }
    } catch (e) {
        console.log(`Login Error : ${e.message}`)
        process.exit(1)
    }
})

// API 4 POST (to signup the user)
app.post('/signup', async (request, response) => {
    try {
        const {name, email, password} = request.body
        const dbResponse = await client.query(`SELECT * FROM users WHERE email='${email}';`)
        if (dbResponse.rows.length > 0) {
            response.json({ok: false, message: 'Email Already Exist'})
        }
        else {
            const user_id = uuidv4()
            const hashed_password = await bcrypt.hash(password, 10)
            await client.query(`INSERT INTO users (user_id, name, email, password_hash) VALUES ('${user_id}', '${name}', '${email}', '${hashed_password}')`)
            const token = jwt.sign({user_id, email, password}, 'dinesh')
            response.json({ok: true, token})
        }
    }
    catch(e) {
        console.log(`signup error: ${e.message}`)
        process.exit(1)
    }
})