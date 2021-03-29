const fs = require('fs')
const sharp = require('sharp')
require('dotenv').config()
const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const prefix = process.env.S3_FOLDER
const bucket = process.env.S3_BUCKET
const s3 = new AWS.S3();

const sizes = [
    {
        width: 400,
    },
]

sizes.forEach(size => {
    resize(size.width, size.height)
})

function resize(width, height) {
    s3.listObjectsV2({
        Bucket: bucket,
        Prefix: prefix
    }, (err, data) => {
        if (err) { throw err }
        data.Contents.forEach(content => {
            if (content.Key !== prefix + '/') {
                s3.getObject({
                    Bucket: bucket,
                    Key: content.Key
                }, (err, res) => {
                    if (err) {
                        return err
                    }
                    const transform = sharp(res.Body)

                    let resizeOptions = {}
                    const tmp = content.Key.split('/')
                    const fileName = tmp[tmp.length - 1]
                    let dstKeyResized = ''

                    if (width) {
                        if (height) {
                            resizeOptions = { width, height }
                            dstKeyResized = width + 'x' + height + '/' + fileName
                        } else {
                            resizeOptions = { width }
                            dstKeyResized = 'width/' + width + '/' + fileName
                        }
                    } else if (height) {
                        resizeOptions = { height }
                        dstKeyResized = 'height/' + height + '/' + fileName
                    }

                    transform.resize(resizeOptions).toBuffer().then(buffer => {
                        s3.putObject({
                            Bucket: bucket,
                            Key: dstKeyResized,
                            Body: buffer,
                            ACL: 'public-read',
                            ContentType: 'image/jpeg'
                        }, (err) => {
                            if (err) { throw err }
                        });
                    })
                })
            }
        })
    });
}
