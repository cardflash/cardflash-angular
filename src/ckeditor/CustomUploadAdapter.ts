import { DataApiProvider } from "src/app/types/data-api-provider";

export class MyUploadAdapter {
    public loader: any;
    public provider: DataApiProvider;
    constructor( loader: any, provider: DataApiProvider ) {
        // The file loader instance to use during the upload.
        this.loader = loader;
        this.provider = provider;
    }

    // Starts the upload process.
    upload() {
        return this.loader.file
        .then(( file : any )=> new Promise( ( resolve, reject ) => {
                console.log('upload',{file})
                this.provider.saveFile(file).then((entry) => {
                    this.provider.getFileView(entry.$id).then((url) => {
                        console.log('Upload finished' , url)
                        resolve({
                            default: url.href
                        }
                        )
                    }).catch((r) => reject(r))
                }).catch((r) => reject(r))
            })
            )
    }

    // Aborts the upload process.
    abort() {
        console.log('abort')
    }

    // Initializes the XMLHttpRequest object using the URL passed to the constructor.
    _initRequest() {
        console.log('initRequest')
    }

    // Initializes XMLHttpRequest listeners.
    _initListeners( resolve: any, reject: any, file: any ) {

    }

    // Prepares the data and sends the request.
    _sendRequest( file: any ) {
        // Prepare the form data.
        console.log('_sendRequest')
    }
}

