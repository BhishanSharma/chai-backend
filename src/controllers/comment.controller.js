import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
      };
    
    const comment = Comment.aggregate([
        {
            $match:{
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline:[
                    {
                        $project:{
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                        }
                    },
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first: "$owner"
                }
            }
        }
    ]);

    const comments = await Comment.aggregatePaginate(comment, options);

    res.status(200).json(
        new ApiResponse(200,comments,"Comments fetched successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
    const {content, videoId} = req.body
    const owner = new mongoose.Types.ObjectId(req.user._id);

    if (
        [content, videoId].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const comment = await Comment.create({
        content,
        videoId,
        owner,
    })

    const createdComment = await Comment.findById(comment._id);
    
    if (!createdComment) {
        throw new ApiError(500, "Something went wrong while uploading the comment")
    }
    
    return res.status(201).json(
        new ApiResponse(200, createdUser, "comment uploaded Successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const owner = new mongoose.Types.ObjectId(req.user._id)
    const commentId = new mongoose.Types.ObjectId(req.body.commentId)
    
    const { content } = req.body

    const comment = await Comment.findById(commentId);
    if (!comment.owner.equals(owner)) {
        throw new ApiError(409,"Unauthorized access");
    }
    comment.content = content;
    comment.save();

    res.status(200).json(new ApiResponse(200,{},"Comment updated Successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const owner = new mongoose.Types.ObjectId(req.user._id)
    const commentId = new mongoose.Types.ObjectId(req.body.commentId)

    const comment = await Comment.findById(commentId);

    if (!comment.owner.equals(owner)) {
        throw new ApiError(409,"Unauthorized access");
    }

    await comment.deleteOne();

    res.status(200).json(new ApiResponse(200,{},"Comment deleted Successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
