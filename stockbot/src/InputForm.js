import './App.scss';
import './InputForm.scss';
import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Popup from './Popup.js'
import { Oval } from 'react-loader-spinner'
import { motion, AnimatePresence } from "framer-motion";
import { BiPencil } from 'react-icons/bi'
import { BsSearch,BsCalendarDate,BsFillCalendar2DateFill,BsCheckLg } from 'react-icons/bs'
import { GoArrowRight } from 'react-icons/go'
import { MdDateRange } from 'react-icons/md'
import { LiaTimesSolid } from 'react-icons/lia'
import { DateCalendar } from '@mui/x-date-pickers';
import dayjs from 'dayjs'

const Dropdown = ({ models, selected, onSelect, onToggle }) => {
    const [model, setModel] = useState(selected)
    const [isOpen, setIsOpen] = useState(false)
    function handleSelect(e) {
        setModel(e)
        onSelect(e)
    }
    const container = {
        hidden: { height: 0 },
        show: {
          height: "auto",
          transition: {
            staggerChildren: 0.25
          }
        }
      }
    return (
        <motion.div
            className='dropdown-list-container'
            initial="hidden"
            animate="show">
            <motion.ul className='model-dropdown-list'
            initial="hidden"
            animate="show"
            exit={{height:"0"}}
            variants={container}
            transition={{
            type: "tween",
            duration:.2
            }}
            >
            {models.map((item, index)=> (
                <motion.span className={`input-wrapper-dropdown-list-item ${item===model?"item-selected":''}`}
                onClick={()=>handleSelect(item)}
                variants={item}
                initial={{opacity:'0'}}
                animate={{opacity:"1"}}
                exit={{x:30, opacity:'0',
                transition:{duration:.15, delay:.15*(3-index)}}}
                transition={{
                type: "tween",
                delay:index*0.1
                }}>
                    <motion.span className='input-content test'
                    name="model" 
                    style={{display:"flex", fontWeight:"500",alignItems:"center", backgroundColor:"transparent", fontSize:"clamp(10px, 3vw, 14px)", fontFamily:"Rubik"}}>
                        {item}
                        {(item===model)&&
                        <BsCheckLg style={{color:"#fff",width:"1.125em", height:"1.125em",
                        paddingLeft:".7em", paddingBottom:".025em"}}/>
                        }
                    </motion.span>
                </motion.span>   
                ))
            }
            </motion.ul>
        </motion.div>
    )
}
const DatePicker = ({ value, type, onSelect, onClose }) => {
    const [newDate, setNewDate] = useState(value.length>0?dayjs(value):dayjs())
    function handleChange(selected) {   
        setNewDate(selected)
        onSelect(type, selected)
    }
    const modalRef = useRef(null);
    const handleOutsideClick = (event) => {  // closes and unblurs the screen 
        if (modalRef.current && !modalRef.current.contains(event.target)) {
            onClose();
        }
    };
    useEffect(() => {   // trigger the above if you click outside the calender
        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, []);
    return (
        <motion.div
        initial={{opacity:0}}
        animate={{opacity:1}}
        exit={{opacity:0}}
        transition={{
            type: "tween",
            duration:.2
        }}
        >
        <DateCalendar value={value.length>0?dayjs(value):dayjs(newDate)} 
        onChange={(selected) => handleChange(selected)} showDaysOutsideCurrentMonth
        fixedWeekNumber={6} ref={modalRef}/>
        </motion.div>
    )
}
export default function InputForm({ onHandleSubmit }) {
    const [openStart, setOpenStart] = useState(false)
    const [openEnd, setOpenEnd] = useState(false) 
    const [toggleDropdown, setToggleDropdown] = useState(false)
    const [models, setModels] = useState(["Echo State", "Linear Regression", "Random Forest", "ARIMA"])
    // ensures date is in form 'YYYY-MM-DD'
    const dateRegex = /^(?:19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
    // what actually gets submitted
    const [formData, setFormData] = useState({
        symbol:'',
        startDate:'',
        endDate:'',
        intervals:'',
        model:'Echo State'
    })
    function handleDropdown() {
        setToggleDropdown(!toggleDropdown)
    }
    function formatDate(date) {
        var year = date.getFullYear();
        var month = (1 + date.getMonth()).toString().padStart(2, '0');
        var day = date.getDate().toString().padStart(2, '0');
        return year + '-' + month + '-' + day;
    }
    const handleDateChange = (name, date) => {
        setFormData((prevData) => ({
            ...prevData,
            [name]: dateRegex.test(date)?date:formatDate(new Date(date))
        }))
    }
    const handleModelChange = (value) => {
        setFormData((prevData) => ({
            ...prevData,
            ["model"]: value,
        }));
    }
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if(name === "startDate" || name === 'endDate') { // refresh the calender when input is switched
            setOpenStart(false)
            setOpenEnd(false)
        }
        setFormData((prevData) => ({
          ...prevData,
          [name]: value,
        }));
    };
    const handleSubmit = () => {
        console.log(formData)
        onHandleSubmit(formData)
    };
    function handleClose() {
        setOpenStart(false)
        setOpenEnd(false)
    }
    // opens respective calenders
    useEffect(()=> {
        if (toggleDropdown) {
            setOpenEnd(false)
            setOpenStart(false)
        }
    }, [toggleDropdown])
    useEffect(()=> {
        if (openStart) {
            setOpenEnd(false)
            setToggleDropdown(false)
        }
    }, [openStart])
    useEffect(()=> {
        if (openEnd) {
            setOpenStart(false)
            setToggleDropdown(false)
        }
    }, [openEnd])
    return (
        <div className='input-form-container '>
            <div className='form-content'>
                <div className='fields-container'> 
                    <div className='input-container'>
                        <p className='input-header-text'>
                            Ticker Symbol 
                        </p>
                        <div className='input-wrapper'>
                            <input className='input-content'
                            type="text"
                            name="symbol"
                            value={formData.symbol.toUpperCase()}
                            onChange={(e)=>handleInputChange(e)}
                            placeholder='Enter a valid ticker symbol...'/>
                        </div>
                    </div>
                    <div className='input-date-container'>
                        <div className='start-date-container'>
                            <p className='input-header-text-alt'>
                            Start Date 
                            </p>
                            <div className='input-wrapper'>
                                <input className='input-content-alt '
                                type='text'
                                name="startDate"
                                value={formData.startDate}
                                onChange={(e)=>handleInputChange(e)}
                                placeholder='YYYY-MM-DD'/>
                                <span className='calender-icon-wrapper' 
                                    onClick={()=>setOpenStart(!openStart)}>
                                    <BsFillCalendar2DateFill className='calender-icon'/>   
                                </span>
                            </div>
                        </div>
                        <div className='end-date-container'>
                            <p className='input-header-text-alt'>
                            End Date 
                            </p>
                            <div className='input-wrapper'>
                                <input className='input-content-alt'
                                    type='text'
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={(e)=>handleInputChange(e)}
                                    placeholder='YYYY-MM-DD'/>
                                    <span className='calender-icon-wrapper' 
                                    onClick={()=>setOpenEnd(!openEnd)}>
                                    <BsCalendarDate className='calender-icon-alt'/>   
                                    </span>
                            </div>
                        </div>
                    </div>
                    <div className='input-container-bottom'>
                        <div className='input-interval-container'>
                            <p className='input-header-text-alt'>
                            Interval
                            </p>
                            <div className='input-wrapper'>
                                <input className='input-content'
                                    type='text'
                                    name="intervals"
                                    value={formData.intervals}
                                    onChange={(e)=>handleInputChange(e)}
                                    placeholder='Enter a valid interval...'/>
                            </div>
                        </div>
                        <motion.div className='input-model-container'>
                            <p className='input-header-text-alt'>
                            Model
                            </p>
                            <motion.div className={'input-wrapper-dropdown-item'}>
                                <span className='input-content' name="model" onClick={()=>handleDropdown()}
                                style={{display:"flex", alignItems:"center", fontSize:"clamp(10px, 3vw, 14px)", fontFamily:"Rubik"}}>
                                    {formData.model}
                                </span>
                            </motion.div>   
                        </motion.div>
                    </div>
                    <span className='submit-button' 
                    role='button'
                    tabIndex={'0'}
                    onClick={()=>handleSubmit()}>
                        <p className='submit-text'>
                            Submit
                        </p>
                        <GoArrowRight className="button-icon"/>
                    </span>
                </div>
            </div>
            <AnimatePresence>
                {(toggleDropdown && !openEnd && !openStart)&&
                    <Dropdown models={models} selected={formData.model} 
                    onSelect={(e)=>handleModelChange(e)}/>
                }
                </AnimatePresence>
            {
                <div className={`${(openStart || openEnd)?'calender-container ':'calender-container-alt'}`}>
                    
                    <AnimatePresence>
                    <DatePicker 
                        value={(openStart)?formData.startDate:formData.endDate} 
                        type={(openStart)?'startDate':'endDate'}
                        onSelect={(name, selected)=>handleDateChange(name, selected)}
                        onClose={()=>handleClose()}/>      
                    </AnimatePresence>
                </div>
            }
        </div>
    )
}
