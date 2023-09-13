import React, {useState} from 'react'

export default function Testing() {
  const [shouldDropdown, setShouldDropdown] = useState(false)
  return (
    <div style={{color:"white"}}>
        Testing
        <span onClick={()=>setShouldDropdown(!shouldDropdown)}>
          click me
        </span>
        {(shouldDropdown)&&
            <div className='dropdown' style={{height:"100px", backgroundColor:"red", color:"white"}}>
              stuff
            </div>
        }
    </div>
  )
}
