import axios from "axios";

const useAxios = () => {
  const baseURL = "http://cloud.startcode.com.co:8000/api/v1";

  const post = async (url, data) => {
    try {
      const response = await axios.post(`${baseURL}${url}`, data, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return response.data;
    } catch (error) {
      console.error("Error en la petición POST:", error);
      throw error;
    }
  };

  return { post };
};

export default useAxios;
