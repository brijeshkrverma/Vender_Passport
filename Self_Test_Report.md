org.admin@globaltech.com
password

http://localhost:5173/users

1. Register page pe do status me Active 2 bar a rha hai.
2. is page pe pagination nhi hai.
3. edit popup error:- Cast to ObjectId failed for value "undefined" (type string) at path "_id" for model "User"
4. register,edit and delete hone pe popup message aana chahiye.
5. Organization admin Khud ko delete nhi kar sakta. Agar wo khud login hai aur khud ka data delete karna chahe to nhi kar sakta. isliye delete button hide hona chahiye.
6. delete ki api se 500 a rha hai(soft delete hona chahiye).

http://localhost:5173/organizations

 Dikhega: cards — vendors, partners, clients — compliance score bar ke saath.

▶️ Ab ek cheez dhundo: "Add Organization" button.

👀 Nahi milega. Yeh page sirf padhne ke liye hai (Organizations.jsx — koi create/edit code nahi).

📌 Yeh gap hai, feature nahi. Backend me POST /api/organizations bana hua hai (org.routes.js), par UI me use karne ka koi raasta nahi. Aisi cheezein aapko poore project me milengi — backend taiyar, UI adhura.