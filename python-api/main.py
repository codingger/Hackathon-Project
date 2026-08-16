from fastapi import FastAPI;
app=FastAPI()
@app.get("/")
def home():
    return{
        "message":"python api is working!"
    }
