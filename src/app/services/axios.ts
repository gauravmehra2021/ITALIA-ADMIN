import axios from 'axios';

const axiosInstance = axios.create({
  baseURL:
    'https://api.sseuropa.com/api/',
  headers: {
    'Content-Type':
      'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        'accessToken'
      );

    if (token) {
      config.headers.Authorization = `${token}`;
    }

    return config;
  }
);

export default axiosInstance;