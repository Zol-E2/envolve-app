import React from 'react'
import Image from 'next/image'
import Link from "next/link";

const CTA = () => {
  return (
    <section className="cta-section">
        <div className="cta-badge">
            Start Learning Now
        </div>
        <h2 className="text-3xl font-bold">
            Build and Personalize Your Learning Path! 
        </h2>
        <p>
            Join eNvolve today and take the first step towards mastering new skills with our tailored courses and interactive lessons.
        </p>
        <Image src="/images/cta.svg" alt="cta" width={362} height={232} />
        <button className="btn-primary">
            <Image src="/icons/plus.svg" alt="plus" width={12} height={12}/>
            <Link href="/courses/new">
                <p>Build a New Course</p>
            </Link>
        </button>
    </section>
  )
}

export default CTA