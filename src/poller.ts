import axios, { AxiosInstance, AxiosResponse } from "axios";


interface ResponseHandler {
    (endpoint: string, response: AxiosResponse, err: AxiosResponse): void;
}

/** Class to poll an API endpoint continuously using a specified delay */
class Poller {
    readonly axiosInstance: AxiosInstance
    readonly endpoints: Array<string>;
    readonly callback: Function;
    interval: number;
    protected pollers: Array<Function> = [];
    stopped = false;

    /**
     * Create a poller to poll API endpoints repeatedly with a specified delay.
     * @param {Array} endpoints - The list of endpoints to poll.
     * @param {number} interval - The interval between requests (in ms). Takes request time into account, if a request takes 250ms we'll wait another 750.
     * @param {number} timeout - The amount of time to wait before considering a request as "timed out"
     * @param {ResponseHandler} callback - Callback to execute on the response.
     */
    constructor(endpoints: Array<string>, interval = 1000, timeout = 15000, callback: ResponseHandler){
        this.endpoints = endpoints;
        this.callback = callback;
        this.interval = interval;
        this.axiosInstance = axios.create({
            timeout: timeout
        })

        //Create rate limtited closures for each endpoint
        this.endpoints.forEach(endpoint => {
            let throttled = true;
            let queued = false;

            let poller = async () => {
                if(throttled && !this.stopped){
                    //Prevent repeated calls
                    throttled = false;

                    //Make a request to our endpoint, pass the response to our callback, and initiate the next request,
                    this.axiosInstance.get(endpoint)
                    .then(res => {
                        this.callback(endpoint, res);
                        setImmediate(() => {
                            poller();
                        })
                    })
                    .catch(err => {
                        this.callback(endpoint, undefined, err)
                        setImmediate(() => {
                            poller();
                        })
                    })

                    //After 1 second allow the function to run, run it immediately if it's queued
                    setTimeout(() => {
                        throttled = true;
                        if(queued){
                            setImmediate(() => {
                                poller()
                            })
                            queued = false;
                        }
                    }, this.interval)
                }else{
                    //If the function is called while it's throttled, add it to the queue so it's called immediately after the throttle ends
                    queued = true;
                }
            }
            this.pollers.push(poller)
        })
    }

    start = () => {
        this.stopped = false;
        this.pollers.forEach((poller, index) => {
            poller(this.callback)
        })
    }

    stop = () => {
        this.stopped = true;
    }
}

export default Poller