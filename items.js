const router = require("express").Router();
const {verify} = require("./verify");
const {query} = require("./sql");
const {OKResponse, InternalServerErrorResponse, NotFoundResponse} = require("./customResponses");

router.get("/", verify, (req,res) => {
    return query("SELECT * FROM products").then((response) => {
        return OKResponse(res, "Returned all items", response);
    }).catch((error) => {
       console.error("Error getting all products");
       return InternalServerErrorResponse(res, "Could not fetch all products. Try again later.");
    });
});

router.get("/:productName", verify, (req,res) => {
    const productName = req.params.productName;
    return query("SELECT * FROM products WHERE Name = ?", [productName]).then((response) => {
        if(response <= 0) return NotFoundResponse(res, "Item does not exist.");
        return OKResponse(res, "Item returned", response);
    }).catch((error) => {
       console.error("Error getting all products");
       return InternalServerErrorResponse(res, "Could not fetch all products. Try again later.");
    });
});

router.post("/insert", verify, (req,res) => {

});

router.post("/remove", verify, (req,res) => {

})


module.exports = router;