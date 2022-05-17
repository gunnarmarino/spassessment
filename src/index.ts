import {geoContains} from "d3-geo";
import Poller from "./poller.js"
import type { Polygon, Point, FeatureCollection } from "geojson"; 
import Mailer from "./mailer.js";
let endpoints = [];
let transporter: any;
for(let i = 1; i < 8; i++){
    endpoints.push(`https://3qbqr98twd.execute-api.us-west-2.amazonaws.com/test/clinicianstatus/${i}`)
}
const mailer = new Mailer();

const poller = new Poller(endpoints, 1000, 15000, async (endpoint, response, err) => {
    let sprinterID = endpoint.split("/")[endpoint.split("/").length - 1]
    if(err){
        //If our endpoint doesnt respond for some reason, then alert the admin and IT staff. Also log the err
        console.log(err);
        await mailer.noResponseAlert("admin@sprinterhealth.com, IT@sprinterhealth.com", sprinterID)
        return;
    }

    let data: FeatureCollection = response.data;

    //Get all areas that the sprinter can be in
    let validAreas = data.features.filter(feature => {
        return feature.geometry.type == "Polygon";
    })

    //Get the point the sprinter is at
    let point = data.features.find(feature => {
        return feature.geometry.type == "Point";
    })

    //Determine if the sprinter is within one of the valid areas
    let withinValidLocation = false;
    validAreas.forEach(area => {
        //This if statement is a bit redundant... needed it to make typescript happy
        if(point?.geometry.type == "Point"){
            let coords: [number, number] = [point.geometry.coordinates[0], point.geometry.coordinates[1]]
            withinValidLocation = withinValidLocation == true ? true : !geoContains(area.geometry, coords); //geoContains returns the opposite of what you'd expect... False if it contains the point, true if not.
        }   
    })
    
    //If sprinter isn't within a valid area, send an alert to the admin
    if(!withinValidLocation){
        //We may want to have some logic to throttle these alerts to once every 5 minutes or so
        //I'd put that logic within the mailer if I had more time...
        await mailer.outOfBoundsAlert("admin@sprinterhealth.com", sprinterID)
    }
})

mailer.init(() => {
    console.log("Nodemailer ready");
    poller.start();
})
