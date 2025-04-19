const http = require('http');
const fs = require('fs');
const url = require('url');
const event = require('events');

const todos = path(__dirname, "todos.json");
const logFile = path(__dirname, "logs.txt");

const logger = new event();

logger.on('log', (message) => {
    const logEntry = `new Date().toISOString()} - ${message}\n`
    fs.appendFile(logFile, logEntry, (err)=> {
        if (err) { 
            console.error(`Failed to write log: ${err}`) }
    });
});


function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}
 

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean); // split and remove empty
    
    if (pathParts[0] !== 'todos') {
      return sendJSON(res, 404, { message: 'Not Found' });
    }
    
    const method = req.method;
    const id = pathParts[1] ? parseInt(pathParts[1]) : null;
  
    // Load todos from file
    const todos = await readTodos();
  
    if (method === 'GET') {
      if (id) {
        const todo = todos.find(t => t.id === id);
        if (todo) {
          logger.emit('log', `GET /todos/${id}`);
          return sendJSON(res, 200, todo);
        } else {
          return sendJSON(res, 404, { message: 'Todo not found' });
        }
      } else {
        logger.emit('log', `GET /todos`);
        return sendJSON(res, 200, todos);
      }
    }
  
    if (method === 'POST' && !id) {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const newTodo = JSON.parse(body);
          if (!newTodo.title) {
            return sendJSON(res, 400, { message: 'Title is required' });
          }
          newTodo.id = generateId(todos);
          newTodo.completed = newTodo.completed ?? false;
          todos.push(newTodo);
          await writeTodos(todos);
          logger.emit('log', `POST /todos`);
          return sendJSON(res, 201, newTodo);
        } catch (error) {
          return sendJSON(res, 400, { message: 'Invalid JSON' });
        }
      });
      return;
    }
  
    if (method === 'PUT' && id) {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const updateData = JSON.parse(body);
          const index = todos.findIndex(t => t.id === id);
          if (index === -1) {
            return sendJSON(res, 404, { message: 'Todo not found' });
          }
          todos[index] = { ...todos[index], ...updateData };
          await writeTodos(todos);
          logger.emit('log', `PUT /todos/${id}`);
          return sendJSON(res, 200, todos[index]);
        } catch (error) {
          return sendJSON(res, 400, { message: 'Invalid JSON' });
        }
      });
      return;
    }
  
    if (method === 'DELETE' && id) {
      const index = todos.findIndex(t => t.id === id);
      if (index === -1) {
        return sendJSON(res, 404, { message: 'Todo not found' });
      }
      todos.splice(index, 1);
      await writeTodos(todos);
      logger.emit('log', `DELETE /todos/${id}`);
      return sendJSON(res, 200, { message: 'Todo deleted' });
    }
  
    return sendJSON(res, 405, { message: 'Method Not Allowed' });
  });
  

server.listen(3000, () => {
console.log('Server is running at http://localhost:3000');
});




function readTodos() {
return new Promise((resolve, reject) => {
    fs.readFile('todos.json', 'utf8', (err, data) => {
    if (err) reject(err);
    else resolve(JSON.parse(data));
    });
});
}

function writeTodos(todos) {
return new Promise((resolve, reject) => {
    fs.writeFile('todos.json', JSON.stringify(todos, null, 2), (err) => {
    if (err) reject(err);
    else resolve();
    });
});
}

function generateId(todos) {
return todos.length ? Math.max(...todos.map(t => t.id)) + 1 : 1;
}