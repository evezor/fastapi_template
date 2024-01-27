# fastapi_template

Fastapi docker-compose repo with most all the things I like in a fastapi app

examples include but are not limited to:

- Pydantic BaseModel
- static files
- template responses
- env files and useage (keep .env files safe this is just an example!!)
- forms
    - get
    - post
    - using raw form data (nice for simple radio buttons)
- simple js fetch with a form as input
- redirect response

reload flag is set with uvicorn so the app will be reloaded every time a .py file is saved

let me know if there's something you'd like to see added

## Directions
From the root of this directory type

`docker-compose up --build`

then you direct your browser to : http://localhost:8000

openapi doc can be found here: http://localhost:8000/docs 

----

subsequent builds you can just do 

`docker-compose up`

to stop container

`docker-compose down`


Hope you enjoy!!