import axios from 'axios';

const usersClient = axios.create({
  baseURL: 'https://dummyjson.com',
  timeout: 15000,
});

export async function fetchUsers({ limit = 30, skip = 0 } = {}) {
  const { data } = await usersClient.get('/users', {
    params: { limit, skip },
  });
  return data;
}
