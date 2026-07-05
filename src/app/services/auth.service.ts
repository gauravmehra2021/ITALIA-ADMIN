import axiosInstance from './axios';

export const loginApi = async (
  email: string,
  password: string
) => {
  const response = await axiosInstance.post(
    '/admin/login',
    {
      email,
      password,
    }
  );

  return response.data;
};

export const forgotPasswordApi = async (
  email: string
) => {
  const response = await axiosInstance.post(
    '/admin/forgetpassword',
    {
      email,
    }
  );

  return response.data;
};

export const verifyOtpApi = async (
  userId: string,
  otp: string
) => {
  const response = await axiosInstance.post(
    '/admin/verifyotp',
    {
      userId,
      otp,
    }
  );

  return response.data;
};

export const resendOtpApi = async (
  email: string
) => {
  const response = await axiosInstance.post(
    '/admin/resendOtp',
    {
      email,
    }
  );

  return response.data;
};

export const resetPasswordApi = async (
  userId: string,
  password: string
) => {
  const response = await axiosInstance.post(
    '/admin/resetpassword',
    {
      userId,
      password,
    }
  );

  return response.data;
};

export const getProfileApi = async () => {
  const response = await axiosInstance.get(
    '/admin/getProfile'
  );

  return response.data;
};

export const editProfileApi = async (data: {
  admin_name: string;
  email: string;
  country_code: string;
  phone_number: string;
  profile_image?: File | null;
}) => {
  const formData = new FormData();
  formData.append('admin_name', data.admin_name);
  formData.append('email', data.email);
  formData.append('country_code', data.country_code);
  formData.append('phone_number', data.phone_number);
  if (data.profile_image) formData.append('profile_image', data.profile_image);

  const response = await axiosInstance.put('/admin/editProfile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getEmployeesApi = async () => {
  const response = await axiosInstance.get('/admin/employees');
  return response.data;
};

export const createEmployeeApi = async (data: {
  admin_name: string;
  email: string;
  password: string;
  country_code?: string;
  phone_number?: string;
}) => {
  const response = await axiosInstance.post('/admin/createEmployee', data);
  return response.data;
};

export const changePasswordApi = async (
  oldPassword: string,
  newPassword: string
) => {
  const response = await axiosInstance.patch(
    '/admin/changePassword',
    {
      oldPassword,
      newPassword,
    }
  );

  return response.data;
};