const OKResponse = (res, message, data) =>
{
    if(!data) return res.status(200).json({"code": 200, "message": message, "data": null});
    return res.status(200).json({"code": 200, "message": message, "data": data});
}
const NotAuthorisedResponse = (res, message, data) =>
{
    if(!data) return res.status(401).json({"code": 401, "message": message, "data": null});
    return res.status(401).json({"code": 401, "message": message, "data": data});
}
const MalformedBodyResponse = (res, message, data) =>
{
    if(!data) return res.status(400).json({"code": 400, "message": message, "data": null});
    return res.status(400).json({"code": 400, "message": message, "data": data});
}
const InternalServerErrorResponse = (res, message, data) =>
{
    if(!data) return res.status(500).json({"code": 500, "message": message, "data": null});
    return res.status(500).json({"code": 500, "message": message, "data": data});
}

module.exports = {OKResponse, NotAuthorisedResponse, MalformedBodyResponse, InternalServerErrorResponse};