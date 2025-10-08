import { publicAxios } from "./axiosconfig";
export class AuthService{
    static async Login(user){
        //throw new Error('Usuario y contraseña son requeridos');
        const dataFrom = new FormData();
        dataFrom.append("username",user.username.trim())
        dataFrom.append("password",user.password)
        try {
            const response = await publicAxios.post('/auth/login',formData,{headers: {'Content-Type': 'application/x-www-form-urlencoded',},timeout: 10000});
        } catch (error) {
            
        }
    } 
}