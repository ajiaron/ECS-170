import React, { useState, useEffect, useRef } from 'react'
import { motion } from "framer-motion";
import './Results.scss'
import { LiaTimesSolid } from 'react-icons/lia'

const ResultItem = ({day, price, type}) => {
    return (
        <div className={`${day===5?'results-last':'results-content'}`}>
            <div className='results-content-day'>
                {day}
            </div>
            <div className='results-content-close'>
                {`${type==="Random Forest"?"":"$"}${parseFloat(type==="Random Forest"?price*100:price).toFixed(2)}${type==="Random Forest"?"%":""}`}
            </div>
        </div>
    )
}
export default function Results({data, input, error, type, onClose}) {
    return (
        <motion.div
            className="results-container"
            initial={{ opacity: 0}}
            animate={{ opacity: 1}}
            exit= {{ opacity:0 }}
            transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
        }}
    >
        <div className='results-wrapper'>
            <div className={"results-header-container"}>
                <p className={"results-header-text"}>
                    {`Prediction Results`}
                </p>
                <span className='close-icon-container' onClick={()=>onClose()}>
                    <LiaTimesSolid className='close-icon'/>
                </span>
      
            </div>
            <div className={'results-content-container'}>
                <div className='results-content-header'>
                    <div className="results-last">
                        <div className='results-content-day-alt' style={{'color':"#a0a0a0"}}>
                            Day
                        </div>
                        <div className='results-content-close-alt'  style={{'color':"#a0a0a0"}}>
                            Close
                        </div>

                    </div>
                </div>
                <div className='results-content-wrapper'>
                    {
                        data.map((item, index)=> (
                            <ResultItem day={index+1} price={item} type={type}/>
                        ))
                    }
                </div>
            </div>
        </div>
        <div className='mse-wrapper'>
            <div className={"mse-header-container"}>
            </div>
            <div className='mse-content'>
                <p className='mse-content-text'>
                    {parseFloat(error).toFixed(2)}
                </p>
                <p className='mse-content-subtext'>
                    Mean-Squared<br></br> Error 
                </p>
            </div>
        </div>
    </motion.div>
  )
}
