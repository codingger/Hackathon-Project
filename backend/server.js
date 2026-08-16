import express from "express"
import bodyparser from "body-parser"
import pg from "pg"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

const app=express()
const port=3000

app.use(bodyparser.urlencoded({extended:true}));
app.use(bodyparser.json())
app.use(cors())

const db=new pg.Client({
    user:process.env.DB_USER,
    host:process.env.DB_HOST,
    database:process.env.DB_DATABASE,
    password:process.env.DB_PASSWORD,
    port:process.env.DB_PORT,
})
app.listen(port,()=>{
    console.log(`server is running on ${port}`);
})