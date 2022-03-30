import { Client } from 'pg';

const DB_URL = process.env.databaseUrl;

exports.handler = async (event: any) => {
  console.log('event: ', event)
  const client = new Client(DB_URL);
  client.connect();

  const timestamp = new Date().getTime();

  const body = {
    title: `Program: vol.${timestamp}`,
    description: 'Time to learn new program!',
    lecturerId: 1,
    time: timestamp
  };

  try {
    const text = 
      'INSERT INTO programs(title, description, time) VALUES($1, $2, $3) RETURNING *';
    const values = [body.title, body.description, body.time];

    const result = await client.query(text, values);
  
    client.end();
  
    return {
      result,
      statusCode: 200,
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
    }
  }
};
