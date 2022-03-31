import { Client } from 'pg';

type BodyProps = {
  title: string;
  description: string;
};

const DB_URL = process.env.databaseUrl;

const validateBody = (data: string): BodyProps => {
  const parsedData: BodyProps = JSON.parse(data);

  if (!parsedData.title) {
    throw new Error('"title" must be provided!');
  }

  if (!parsedData.description) {
    throw new Error('"description" must be provided!');
  }

  return {
    title: parsedData.title,
    description: parsedData.description,
  }
};

exports.handler = async (event: any) => {
  try {
    console.log('Body: ', event.body);

    const data = validateBody(event.body);

    const client = new Client(DB_URL);
    client.connect();

    const text = 
      'INSERT INTO programs(title, description, time) VALUES($1, $2, $3) RETURNING title';
    const values = [data.title, data.description, 0];

    const result = await client.query(text, values);
  
    client.end();

    const response = { result: {} };

    if (result.rows) {
      response.result = result.rows[0];
    }
  
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: {
        result: err,
      }
    }
  }
};
