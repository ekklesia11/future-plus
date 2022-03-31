"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const DB_URL = process.env.databaseUrl;
const validateBody = (data) => {
    const parsedData = JSON.parse(data);
    if (!parsedData.title) {
        throw new Error('"title" must be provided!');
    }
    if (!parsedData.description) {
        throw new Error('"description" must be provided!');
    }
    return {
        title: parsedData.title,
        description: parsedData.description,
    };
};
exports.handler = async (event) => {
    try {
        console.log('Body: ', event.body);
        const data = validateBody(event.body);
        const client = new pg_1.Client(DB_URL);
        client.connect();
        const text = 'INSERT INTO programs(title, description, time) VALUES($1, $2, $3) RETURNING title';
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
    }
    catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: {
                result: err,
            }
        };
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTRCO0FBTzVCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDO0FBRXZDLE1BQU0sWUFBWSxHQUFHLENBQUMsSUFBWSxFQUFhLEVBQUU7SUFDL0MsTUFBTSxVQUFVLEdBQWMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUUvQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRTtRQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7S0FDOUM7SUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRTtRQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7S0FDcEQ7SUFFRCxPQUFPO1FBQ0wsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLO1FBQ3ZCLFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVztLQUNwQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDO0FBRUYsT0FBTyxDQUFDLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBVSxFQUFFLEVBQUU7SUFDckMsSUFBSTtRQUNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVsQyxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXRDLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVqQixNQUFNLElBQUksR0FDUixtRkFBbUYsQ0FBQztRQUN0RixNQUFNLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVqRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRWhELE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUViLE1BQU0sUUFBUSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBRWhDLElBQUksTUFBTSxDQUFDLElBQUksRUFBRTtZQUNmLFFBQVEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNsQztRQUVELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtZQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztLQUNIO0lBQUMsT0FBTyxHQUFHLEVBQUU7UUFDWixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLElBQUksRUFBRTtnQkFDSixNQUFNLEVBQUUsR0FBRzthQUNaO1NBQ0YsQ0FBQTtLQUNGO0FBQ0gsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2xpZW50IH0gZnJvbSAncGcnO1xuXG50eXBlIEJvZHlQcm9wcyA9IHtcbiAgdGl0bGU6IHN0cmluZztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbn07XG5cbmNvbnN0IERCX1VSTCA9IHByb2Nlc3MuZW52LmRhdGFiYXNlVXJsO1xuXG5jb25zdCB2YWxpZGF0ZUJvZHkgPSAoZGF0YTogc3RyaW5nKTogQm9keVByb3BzID0+IHtcbiAgY29uc3QgcGFyc2VkRGF0YTogQm9keVByb3BzID0gSlNPTi5wYXJzZShkYXRhKTtcblxuICBpZiAoIXBhcnNlZERhdGEudGl0bGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1widGl0bGVcIiBtdXN0IGJlIHByb3ZpZGVkIScpO1xuICB9XG5cbiAgaWYgKCFwYXJzZWREYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdcImRlc2NyaXB0aW9uXCIgbXVzdCBiZSBwcm92aWRlZCEnKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdGl0bGU6IHBhcnNlZERhdGEudGl0bGUsXG4gICAgZGVzY3JpcHRpb246IHBhcnNlZERhdGEuZGVzY3JpcHRpb24sXG4gIH1cbn07XG5cbmV4cG9ydHMuaGFuZGxlciA9IGFzeW5jIChldmVudDogYW55KSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coJ0JvZHk6ICcsIGV2ZW50LmJvZHkpO1xuXG4gICAgY29uc3QgZGF0YSA9IHZhbGlkYXRlQm9keShldmVudC5ib2R5KTtcblxuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBDbGllbnQoREJfVVJMKTtcbiAgICBjbGllbnQuY29ubmVjdCgpO1xuXG4gICAgY29uc3QgdGV4dCA9IFxuICAgICAgJ0lOU0VSVCBJTlRPIHByb2dyYW1zKHRpdGxlLCBkZXNjcmlwdGlvbiwgdGltZSkgVkFMVUVTKCQxLCAkMiwgJDMpIFJFVFVSTklORyB0aXRsZSc7XG4gICAgY29uc3QgdmFsdWVzID0gW2RhdGEudGl0bGUsIGRhdGEuZGVzY3JpcHRpb24sIDBdO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50LnF1ZXJ5KHRleHQsIHZhbHVlcyk7XG4gIFxuICAgIGNsaWVudC5lbmQoKTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0geyByZXN1bHQ6IHt9IH07XG5cbiAgICBpZiAocmVzdWx0LnJvd3MpIHtcbiAgICAgIHJlc3BvbnNlLnJlc3VsdCA9IHJlc3VsdC5yb3dzWzBdO1xuICAgIH1cbiAgXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGJvZHk6IHtcbiAgICAgICAgcmVzdWx0OiBlcnIsXG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuIl19