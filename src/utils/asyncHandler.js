const asyncHandler = (func) => {
    return (req,res,next) => {
        Promise.resolve(func(req,res,next))
        .catch(err => next(err))
    }
}

export {asyncHandler}

/*
Understand like this 

const asyncHandler = (func) => { () => {} } which can be written as:
const asyncHandler = (func) => () => {}
const asyncHandler = (func) => async () => {}


asyncHandler - another implementation

const asyncHandler = (func) => { async (req,res,next)=> {
        
        try{
            await func(req,res,next)
        }
        catch(error){
            res.status(err.code || 500).json({
                success: false,
                message : err.message
            })
        }

    }
  }
*/