
class Users {
    constructor( name,Email,password,IsAdmin,adminID) {
        let date = new Date
        return {
            "name":name,
            "Email":Email,
            "password":password,
            'Created': date.toLocaleString(),
            'IsAdmin':IsAdmin,
            "AdminID": adminID,
        
        }
    }

  
}

// function gettime() {

//     return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
  
//   }

module.exports = Users;
